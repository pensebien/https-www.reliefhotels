"use client";

import type { RayzaCatalogue } from "@/lib/integrations/rayza-connect";
import type { RayzaRoomLinks, RayzaSyncRow, ReliefRoomSummary } from "@/lib/integrations/rayza-sync";
import { AlertTriangle, Download, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const input = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm";
const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

type Overview = {
  enabled: boolean;
  links: RayzaRoomLinks;
  relief: ReliefRoomSummary[];
  catalogue: RayzaCatalogue | null;
  error?: string;
  recent: RayzaSyncRow[];
};

/** RAYZA HMS: link room types, copy room numbers, see and retry the booking sync. */
export function RayzaPanel({ q, roomName }: { q: string; roomName: (id: string) => string }) {
  const t = useTranslations("staffChannels.rayza");
  const [data, setData] = useState<Overview | null>(null);
  const [links, setLinks] = useState<RayzaRoomLinks>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/staff/settings/rayza${q}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setData(body);
      setLinks(body.links);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  async function call(kind: string, method: "PUT" | "POST", payload: unknown, done: (body: Record<string, unknown>) => string) {
    setBusy(kind);
    setNotice(null);
    const res = await fetch(`/api/staff/settings/rayza${q}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    setBusy(null);
    setNotice(res.ok ? done(body) : (body?.error ?? t("error")));
    load();
  }

  if (!data) return null;

  if (!data.enabled) {
    return (
      <section aria-labelledby="rayza" className="space-y-2">
        <h2 id="rayza" className="font-serif text-xl font-medium">{t("title")}</h2>
        <p className="text-sm text-muted">{t("off")}</p>
      </section>
    );
  }

  const types = data.catalogue?.rooms ?? [];
  const failed = data.recent.filter((r) => r.state === "failed");

  return (
    <section aria-labelledby="rayza" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="rayza" className="font-serif text-xl font-medium">{t("title")}</h2>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            call("sync", "POST", { action: "sync" }, (b) => {
              const s = b.summary as { pushed: number; cancelled: number; failed: number; pending: number } | null;
              return s ? t("synced", s) : t("error");
            })
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-teal disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {busy === "sync" ? t("syncing") : t("syncNow")}
        </button>
      </div>
      <p className="text-sm text-muted">{t("hint")}</p>
      {data.error ? <p className="text-sm text-red-600">{t("unreachable", { error: data.error })}</p> : null}

      <div className="space-y-3">
        {data.relief.map((relief) => {
          const type = types.find((x) => x.id === links[relief.roomId]);
          const saved = data.links[relief.roomId] === links[relief.roomId];
          const numbersDiffer =
            type && (type.roomNumbers.length !== relief.inventory || type.roomNumbers.some((n, i) => relief.unitLabels[i] !== n));
          return (
            <div key={relief.roomId} className="grid gap-3 rounded-xl border border-border bg-card/50 p-4 sm:grid-cols-[10rem_1fr]">
              <div className="text-sm">
                <p className="font-medium">{roomName(relief.roomId)}</p>
                <p className="text-xs text-muted">
                  {t("reliefSide", { n: relief.inventory, guests: relief.maxGuests, price: naira(relief.priceNgn) })}
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-muted">{t("rayzaType")}</span>
                  <select
                    id={`rayza-link-${relief.roomId}`}
                    className={input}
                    value={links[relief.roomId] ?? ""}
                    onChange={(e) =>
                      setLinks((prev) => {
                        const next = { ...prev };
                        if (e.target.value) next[relief.roomId] = e.target.value;
                        else delete next[relief.roomId];
                        return next;
                      })
                    }
                  >
                    <option value="">{t("notLinked")}</option>
                    {types.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                    {links[relief.roomId] && !type ? <option value={links[relief.roomId]}>{links[relief.roomId]}</option> : null}
                  </select>
                </label>
                {type ? (
                  <p className="text-xs text-muted">
                    {t("rayzaSide", {
                      n: type.totalRooms,
                      numbers: type.roomNumbers.join(", "),
                      guests: type.maxOccupancy,
                      price: naira(type.priceNgn),
                    })}
                  </p>
                ) : links[relief.roomId] ? (
                  <p className="text-xs text-red-600">{t("missingType")}</p>
                ) : null}
                {type && relief.maxGuests > type.maxOccupancy ? (
                  <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {t("capacityWarning", { relief: relief.maxGuests, rayza: type.maxOccupancy })}
                  </p>
                ) : null}
                {type && numbersDiffer ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-amber-700 dark:text-amber-300">{t("numbersDiffer")}</span>
                    <button
                      type="button"
                      disabled={busy !== null || !saved}
                      title={saved ? undefined : t("saveFirst")}
                      onClick={() =>
                        call(`import-${relief.roomId}`, "POST", { action: "import", roomIds: [relief.roomId] }, () => t("imported"))
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs hover:border-teal disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      {busy === `import-${relief.roomId}` ? t("importing") : t("import")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => call("save", "PUT", { links }, () => t("saved"))}
          className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950 disabled:opacity-60"
        >
          {busy === "save" ? t("saving") : t("save")}
        </button>
        {notice ? <span className="text-sm text-muted" role="status">{notice}</span> : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">
          {t("recentTitle")}
          {failed.length ? <span className="ml-2 text-red-600">{t("failedCount", { n: failed.length })}</span> : null}
        </h3>
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted">{t("noneYet")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border text-xs">
            {data.recent.map((row) => (
              <li key={row.reservationId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
                <span className="font-mono">{row.reservationId.slice(0, 8)}</span>
                <span className={row.state === "failed" ? "font-medium text-red-600" : "text-teal-dark"}>
                  {t(`state.${row.state}`, { wanted: row.wanted })}
                </span>
                <span className="font-mono text-muted">{row.refs.join(", ")}</span>
                <span className="text-muted">{row.at.slice(0, 16).replace("T", " ")}</span>
                {row.error ? (
                  <span className="basis-full text-red-600">
                    {row.code ? `${row.code}: ` : ""}
                    {row.error}
                    {row.attempts > 1 ? ` (${t("attempts", { n: row.attempts })})` : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
