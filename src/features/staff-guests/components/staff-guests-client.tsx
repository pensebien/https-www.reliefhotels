"use client";

import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { Link } from "@/i18n/navigation";
import type { GuestSummary } from "@/lib/guests/profiles";
import { cn, formatNaira } from "@/lib/utils";
import { ArrowLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";
type Filter = "all" | "returning" | "upcoming" | "blocked";
type Booking = { id: string; room: string; checkIn?: string; checkOut?: string; status: string; totalNgn?: number };

export function StaffGuestsClient() {
  const t = useTranslations("staffGuests");
  const searchParams = useSearchParams();
  const [key, setKey] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [list, setList] = useState<{ total: number; guests: GuestSummary[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setKey(
      searchParams.get("key") ??
        (typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_STORAGE_KEY) : null) ??
        DEFAULT_KEY,
    );
  }, [searchParams]);

  const load = useCallback(async () => {
    if (key === null) return;
    const qs = new URLSearchParams({ key, q, filter });
    const res = await fetch(`/api/staff/guests?${qs}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) setError(res.status === 401 ? "Invalid dashboard key." : res.status === 403 ? "Your role cannot do this." : body?.error ?? t("error"));
    else {
      setError(null);
      setList(body);
    }
  }, [filter, key, q, t]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <Link href={{ pathname: "/staff", query: key ? { key } : undefined }} className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-teal">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToPortal")}
      </Link>
      <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
      <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
      <p className="mt-2 mb-8 text-muted">{t("subtitle")}</p>
      {key !== null && (
        <StaffCalendarKeyForm key={key} initialKey={key} loading={!list && !error} onSubmit={(next) => { window.sessionStorage.setItem(SESSION_STORAGE_KEY, next); setKey(next); }} placeholder={t("keyPlaceholder")} submitLabel={t("unlock")} />
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input id="guest-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm sm:max-w-sm" />
        {(["all", "returning", "upcoming", "blocked"] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={cn("rounded-full border px-3 py-1.5 text-sm", filter === f ? "border-teal bg-teal/15 font-medium" : "border-border hover:border-teal")}>
            {t(`filter.${f}`)}
          </button>
        ))}
      </div>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      {list ? (
        <>
          <p className="mb-2 text-xs text-muted">{t("count", { n: list.total })}</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium">{t("name")}</th>
                  <th className="px-3 py-2 font-medium">{t("contact")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("stays")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("value")}</th>
                  <th className="px-3 py-2 font-medium">{t("lastStay")}</th>
                  <th className="px-3 py-2 font-medium">{t("tags")}</th>
                </tr>
              </thead>
              <tbody>
                {list.guests.map((g) => (
                  <tr key={g.email} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/10" onClick={() => setOpen(g.email)}>
                    <td className="px-3 py-2">
                      <button type="button" className="text-left font-medium text-teal-dark hover:underline" onClick={() => setOpen(g.email)}>{g.name}</button>
                      {g.returning ? <span className="ml-2 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-medium">{t("returning")}</span> : null}
                      {g.blocked ? <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200">{t("blocked")}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-muted">{g.email}{g.phone ? ` · ${g.phone}` : ""}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{g.stays}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNaira(g.valueNgn)}</td>
                    <td className="px-3 py-2 tabular-nums">{g.upcoming ? t("upcomingOn", { date: g.upcoming }) : (g.lastStay ?? "—")}</td>
                    <td className="px-3 py-2">{g.tags.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {open && key ? <GuestDrawer email={open} dashboardKey={key} onClose={() => setOpen(null)} onSaved={load} /> : null}
    </div>
  );
}

function GuestDrawer({ email, dashboardKey, onClose, onSaved }: { email: string; dashboardKey: string; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("staffGuests");
  const [data, setData] = useState<{ guest: GuestSummary; bookings: Booking[] } | null>(null);
  const [tags, setTags] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/staff/guests?${new URLSearchParams({ key: dashboardKey, email })}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled || !body) return;
        setData(body);
        setTags(body.guest.tags.join(", "));
        setCompany(body.guest.company);
        setNotes(body.guest.notes);
        setBlocked(body.guest.blocked);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dashboardKey, email]);

  async function save() {
    const res = await fetch(`/api/staff/guests/profile?key=${encodeURIComponent(dashboardKey)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, tags: tags.split(",").map((s) => s.trim()).filter(Boolean), company, notes, blocked }),
    });
    const body = await res.json().catch(() => null);
    setStatus(res.ok ? t("saved") : res.status === 403 ? t("managerOnly") : body?.error ?? t("error"));
    if (res.ok) onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={data?.guest.name ?? email} className="h-full w-full max-w-md overflow-y-auto bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-semibold">{data?.guest.name ?? "…"}</h2>
            <p className="text-sm text-muted">{email}{data?.guest.phone ? ` · ${data.guest.phone}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className="rounded p-2 text-muted hover:bg-border"><X className="h-5 w-5" aria-hidden /></button>
        </div>
        {data ? (
          <div className="space-y-5 text-sm">
            <dl className="grid grid-cols-3 gap-3">
              <div><dt className="text-xs text-muted">{t("stays")}</dt><dd className="text-lg font-semibold">{data.guest.stays}</dd></div>
              <div><dt className="text-xs text-muted">{t("nights")}</dt><dd className="text-lg font-semibold">{data.guest.nights}</dd></div>
              <div><dt className="text-xs text-muted">{t("value")}</dt><dd className="text-lg font-semibold">{formatNaira(data.guest.valueNgn)}</dd></div>
            </dl>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{t("bookings")}</p>
              <ul className="divide-y divide-border/60 rounded-lg border border-border">
                {data.bookings.map((b) => (
                  <li key={b.id} className="flex justify-between gap-2 px-3 py-2">
                    <span>{b.room} · {b.checkIn} → {b.checkOut}</span>
                    <span className="text-muted">{b.status}</span>
                  </li>
                ))}
              </ul>
            </div>
            <label className="block"><span className="mb-1 block text-xs text-muted">{t("tagsHint")}</span>
              <input id="guest-tags" value={tags} onChange={(e) => setTags(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2" /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">{t("company")}</span>
              <input id="guest-company" value={company} onChange={(e) => setCompany(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2" /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">{t("notes")}</span>
              <textarea id="guest-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2" /></label>
            <label className="flex items-center gap-2"><input id="guest-blocked" type="checkbox" className="h-4 w-4 accent-teal" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />{t("blockLabel")}</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={save} className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950">{t("save")}</button>
              {status ? <span className="text-sm text-muted" role="status">{status}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
