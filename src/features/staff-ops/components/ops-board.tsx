"use client";

import type { OpsRow } from "@/lib/staff-ops";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Filter = "attention" | "upcoming" | "all";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const today = () => new Date().toISOString().slice(0, 10);

/** Something staff should look at: RAYZA refused or keeps failing, or a paid booking never reached it. */
function needsAction(row: OpsRow): boolean {
  if (row.needsAttention) return true;
  if (row.rayza?.state === "failed") return true;
  return row.status === "confirmed" && !row.rayza && Boolean(row.checkIn && row.checkIn >= today());
}

function rayzaLabel(row: OpsRow): "sent" | "released" | "failed" | "notSent" | "none" {
  if (row.rayza?.state === "pushed") return "sent";
  if (row.rayza?.state === "cancelled") return "released";
  if (row.rayza?.state === "failed") return "failed";
  return row.status === "confirmed" ? "notSent" : "none";
}

export function OpsBoard() {
  const t = useTranslations("staffOps");
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  const q = key ? `?key=${encodeURIComponent(key)}` : "";
  const [rows, setRows] = useState<OpsRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string; text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/staff/ops${q}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setRows(body.bookings);
      setLoadError(null);
    } else {
      setLoadError(body?.error ?? t("loadError"));
    }
  }, [q, t]);

  useEffect(() => {
    load();
  }, [load]);

  const attentionCount = rows?.filter(needsAction).length ?? 0;
  const visible = useMemo(() => {
    if (!rows) return [];
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) =>
        filter === "attention"
          ? needsAction(r)
          : filter === "upcoming"
            ? r.status !== "cancelled" && Boolean(r.checkOut && r.checkOut >= today())
            : true,
      )
      .filter((r) => !term || [r.guest, r.email, r.phone, r.id].some((v) => v?.toLowerCase().includes(term)));
  }, [rows, filter, search]);

  async function act(row: OpsRow, body: Record<string, unknown>) {
    setBusy(`${body.action}:${row.id}`);
    setNotice(null);
    const res = await fetch(`/api/staff/ops${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, reservationId: row.id }),
    });
    const json = await res.json().catch(() => null);
    setBusy(null);
    setNotice({ id: row.id, text: res.ok ? json.message : (json?.error ?? t("actionError")), error: !res.ok });
    load();
  }

  function recordTransfer(row: OpsRow) {
    const suggested = row.paidNgn > 0 ? Math.max(0, (row.totalNgn ?? 0) - row.paidNgn) : (row.depositNgn ?? row.totalNgn ?? 0);
    const raw = window.prompt(t("transferPrompt", { guest: row.guest }), suggested ? String(suggested) : "");
    if (raw === null) return;
    const amountNgn = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(amountNgn) || amountNgn <= 0) {
      setNotice({ id: row.id, text: t("invalidAmount"), error: true });
      return;
    }
    act(row, { action: "record_transfer", amountNgn });
  }

  function cancel(row: OpsRow) {
    if (window.confirm(t("cancelConfirm", { guest: row.guest }))) act(row, { action: "cancel" });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-medium">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {(["upcoming", "attention", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm",
              filter === f ? "bg-teal text-gray-950" : "border border-border text-muted hover:text-foreground",
            )}
          >
            {t(`filter.${f}`)}
            {f === "attention" && attentionCount > 0 ? ` (${attentionCount})` : ""}
          </button>
        ))}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="ml-auto h-9 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-64"
        />
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:border-teal"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {t("refresh")}
        </button>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      {!rows && !loadError ? <p className="text-sm text-muted">{t("loading")}</p> : null}
      {rows && visible.length === 0 ? <p className="text-sm text-muted">{t("empty")}</p> : null}

      <ul className="space-y-3">
        {visible.map((row) => {
          const rayza = rayzaLabel(row);
          const flagged = needsAction(row);
          const open = row.status !== "cancelled";
          return (
            <li
              key={row.id}
              className={cn("rounded-xl border bg-card/50 p-4", flagged ? "border-red-400/70" : "border-border")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">
                    {row.guest}
                    <span className="ml-2 font-mono text-xs text-muted">{row.id.slice(0, 8)}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {row.rooms > 1 ? `${row.rooms} × ` : ""}
                    {row.room} · {row.checkIn} → {row.checkOut} · {t("guests", { n: row.guests })}
                  </p>
                  <p className="text-xs text-muted">
                    {row.email}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1",
                      row.status === "confirmed" && "bg-teal/15 text-teal-dark",
                      row.status === "pending" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                      row.status === "cancelled" && "bg-border text-muted",
                    )}
                  >
                    {t(`status.${row.status}`)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1",
                      rayza === "sent" && "bg-teal/15 text-teal-dark",
                      (rayza === "failed" || rayza === "notSent") && "bg-red-500/15 text-red-700 dark:text-red-300",
                      (rayza === "released" || rayza === "none") && "bg-border text-muted",
                    )}
                  >
                    {t(`rayza.${rayza}`)}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-sm">
                {t("paid", { paid: naira(row.paidNgn), total: row.totalNgn !== undefined ? naira(row.totalNgn) : "—" })}
                {row.payments.length ? (
                  <span className="ml-2 text-xs text-muted">
                    {row.payments.map((p) => `${p.reference} ${naira(p.amountNgn)} ${t(`payment.${p.status}`)}`).join(" · ")}
                  </span>
                ) : null}
              </p>

              {row.needsAttention ? (
                <p className="mt-2 flex items-start gap-1.5 text-sm text-red-700 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {t("refused", { error: row.rayza?.error ?? "" })}
                </p>
              ) : row.rayza?.state === "failed" ? (
                <p className="mt-2 text-xs text-red-600">
                  {row.rayza.code ? `${row.rayza.code}: ` : ""}
                  {row.rayza.error}
                  {row.rayza.attempts > 1 ? ` (${t("attempts", { n: row.rayza.attempts })})` : ""}
                </p>
              ) : null}

              {open ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => recordTransfer(row)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-teal disabled:opacity-50"
                  >
                    {busy === `record_transfer:${row.id}` ? t("working") : t("recordTransfer")}
                  </button>
                  {row.status === "confirmed" && rayza !== "sent" ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => act(row, { action: "retry_rayza" })}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-teal disabled:opacity-50"
                    >
                      {busy === `retry_rayza:${row.id}` ? t("working") : t("retryRayza")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => cancel(row)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-red-700 hover:border-red-400 disabled:opacity-50 dark:text-red-300"
                  >
                    {busy === `cancel:${row.id}` ? t("working") : t("cancel")}
                  </button>
                </div>
              ) : rayza === "failed" ? (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => act(row, { action: "retry_rayza" })}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-teal disabled:opacity-50"
                  >
                    {busy === `retry_rayza:${row.id}` ? t("working") : t("retryRelease")}
                  </button>
                </div>
              ) : null}

              {notice?.id === row.id ? (
                <p role="status" className={cn("mt-2 text-sm", notice.error ? "text-red-600" : "text-teal-dark")}>
                  {notice.text}
                </p>
              ) : null}
              {row.staffNotes ? (
                <details className="mt-2 text-xs text-muted">
                  <summary className="cursor-pointer">{t("notes")}</summary>
                  <p className="mt-1 whitespace-pre-line">{row.staffNotes}</p>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
