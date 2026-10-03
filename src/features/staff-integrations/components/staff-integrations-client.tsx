"use client";

import { BookingLinksEditor } from "./booking-links-editor";
import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { Link } from "@/i18n/navigation";
import type { LedgerAccounts } from "@/lib/accounting/journal";
import type { Delivery, Webhook, WebhookEvent } from "@/lib/integrations/webhooks";
import { ArrowLeft, Copy, Download, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";
const input = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm";
type NewHook = Omit<Webhook, "secret"> & { secret?: string };

export function StaffIntegrationsClient() {
  const t = useTranslations("staffIntegrations");
  const searchParams = useSearchParams();
  const [key, setKey] = useState<string | null>(null);
  const [hooks, setHooks] = useState<NewHook[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [deliveries, setDeliveries] = useState<Omit<Delivery, "body">[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccounts | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const month = new Date().toISOString().slice(0, 8);
  const [range, setRange] = useState<[string, string]>([`${month}01`, new Date().toISOString().slice(0, 10)]);

  useEffect(() => {
    setKey(searchParams.get("key") ?? (typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_STORAGE_KEY) : null) ?? DEFAULT_KEY);
  }, [searchParams]);
  const q = key ? `?key=${encodeURIComponent(key)}` : "";

  const load = useCallback(async () => {
    if (key === null) return;
    const [w, l] = await Promise.all([fetch(`/api/staff/settings/webhooks${q}`, { cache: "no-store" }), fetch(`/api/staff/settings/ledger${q}`, { cache: "no-store" })]);
    if (!w.ok || !l.ok) {
      setError(w.status === 401 ? "Invalid dashboard key." : w.status === 403 ? "Your role cannot do this." : t("error"));
      return;
    }
    const wb = await w.json();
    const lb = await l.json();
    setError(null);
    setHooks(wb.hooks);
    setEvents(wb.events);
    setDeliveries(wb.deliveries);
    setAccounts(lb.accounts);
    setNames(lb.names);
  }, [key, q, t]);

  useEffect(() => {
    load();
  }, [load]);

  const call = async (path: string, method: string, body: unknown) => {
    const res = await fetch(`${path}${q}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, body: await res.json().catch(() => null) };
  };

  async function saveHooks() {
    const r = await call("/api/staff/settings/webhooks", "PUT", { hooks });
    setNotice(r.ok ? t("saved") : r.body?.error ?? t("error"));
    if (r.ok) load();
  }

  async function test(id: string) {
    const r = await call("/api/staff/settings/webhooks/test", "POST", { id });
    const d = r.body?.delivery;
    setNotice(d ? (d.status === "sent" ? t("testOk", { status: d.httpStatus }) : t("testFailed", { reason: d.error ?? `HTTP ${d.httpStatus}` })) : t("error"));
    load();
  }

  async function resend(id: string) {
    const r = await call("/api/staff/settings/webhooks/resend", "POST", { id });
    setNotice(r.body?.status === "sent" ? t("resent") : t("resendFailed"));
    load();
  }

  async function saveAccounts() {
    const r = await call("/api/staff/settings/ledger", "PUT", accounts);
    setNotice(r.ok ? t("saved") : r.body?.error ?? t("error"));
  }

  const update = (i: number, change: Partial<NewHook>) => setHooks((prev) => prev.map((h, j) => (j === i ? { ...h, ...change } : h)));
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(t("copied"));
    } catch {
      setNotice(text);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
      <Link href={{ pathname: "/staff", query: key ? { key } : undefined }} className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-teal">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToPortal")}
      </Link>
      <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
      <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
      <p className="mt-2 mb-8 text-muted">{t("subtitle")}</p>
      {key !== null && (
        <StaffCalendarKeyForm key={key} initialKey={key} loading={!accounts && !error} onSubmit={(next) => { window.sessionStorage.setItem(SESSION_STORAGE_KEY, next); setKey(next); }} placeholder={t("keyPlaceholder")} submitLabel={t("unlock")} />
      )}
      {error ? <p className="mb-6 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="mb-6 break-all text-sm text-teal-dark" role="status">{notice}</p> : null}

      {accounts ? (
        <div className="space-y-10">
          <section aria-labelledby="webhooks" className="space-y-3">
            <h2 id="webhooks" className="font-serif text-xl font-medium">{t("webhooksTitle")}</h2>
            <p className="text-sm text-muted">{t("webhooksHint")}</p>
            {hooks.map((hook, i) => (
              <div key={hook.id} className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                  <input aria-label={t("name")} placeholder={t("name")} value={hook.name} onChange={(e) => update(i, { name: e.target.value })} className={input} />
                  <input aria-label={t("url")} placeholder="https://…" value={hook.url} onChange={(e) => update(i, { url: e.target.value })} className={input} />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-teal" checked={hook.active} onChange={(e) => update(i, { active: e.target.checked })} />{t("on")}</label>
                    <button type="button" aria-label={t("remove")} onClick={() => setHooks((prev) => prev.filter((_, j) => j !== i))} className="rounded p-1.5 text-muted hover:text-red-600"><Trash2 className="h-4 w-4" aria-hidden /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {events.map((ev) => (
                    <label key={ev} className="flex items-center gap-1.5">
                      <input type="checkbox" className="h-4 w-4 accent-teal" checked={hook.events.includes(ev)} onChange={(e) => update(i, { events: e.target.checked ? [...hook.events, ev] : hook.events.filter((x) => x !== ev) })} />
                      {t(`event.${ev.replace(".", "_")}`)}
                    </label>
                  ))}
                </div>
                {hook.secret ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted">{t("secret")}</span>
                    <code className="min-w-0 flex-1 truncate rounded bg-muted/10 px-2 py-1">{hook.secret}</code>
                    <button type="button" onClick={() => copy(hook.secret!)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 hover:border-teal"><Copy className="h-3.5 w-3.5" aria-hidden />{t("copy")}</button>
                    <button type="button" onClick={() => test(hook.id)} className="rounded-lg border border-border px-2 py-1 hover:border-teal">{t("sendTest")}</button>
                  </div>
                ) : <p className="text-xs text-muted">{t("secretAfterSave")}</p>}
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setHooks((prev) => [...prev, { id: `hook-${Date.now()}`, name: "", url: "", events: ["booking.created", "booking.confirmed", "booking.cancelled"], active: true }])} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-teal"><Plus className="h-4 w-4" aria-hidden />{t("addHook")}</button>
              <button type="button" onClick={saveHooks} className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950">{t("saveHooks")}</button>
            </div>
            {deliveries.length ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted"><tr className="border-b border-border"><th className="px-3 py-2 font-medium">{t("when")}</th><th className="px-3 py-2 font-medium">{t("eventCol")}</th><th className="px-3 py-2 font-medium">{t("result")}</th><th className="px-3 py-2" /></tr></thead>
                  <tbody>
                    {deliveries.map((d) => (
                      <tr key={d.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 tabular-nums">{d.at.slice(0, 16).replace("T", " ")}</td>
                        <td className="px-3 py-2">{t(`event.${d.event.replace(".", "_")}`)}</td>
                        <td className={`px-3 py-2 ${d.status === "sent" ? "" : "text-red-600"}`}>{d.status === "sent" ? `HTTP ${d.httpStatus}` : d.error ?? `HTTP ${d.httpStatus}`}</td>
                        <td className="px-3 py-2 text-right">{d.status === "failed" ? <button type="button" onClick={() => resend(d.id)} className="text-teal-dark hover:underline">{t("resend")}</button> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <BookingLinksEditor query={q} onNotice={setNotice} />

          <section aria-labelledby="ledger" className="space-y-3">
            <h2 id="ledger" className="font-serif text-xl font-medium">{t("ledgerTitle")}</h2>
            <p className="text-sm text-muted">{t("ledgerHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(accounts) as (keyof LedgerAccounts)[]).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input aria-label={names[k]} value={accounts[k]} onChange={(e) => setAccounts({ ...accounts, [k]: e.target.value })} className="h-9 w-24 shrink-0 rounded-lg border border-border bg-background px-2 text-sm" />
                  <span>{names[k]}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <button type="button" onClick={saveAccounts} className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950">{t("saveAccounts")}</button>
              <label className="text-sm"><span className="mb-1 block text-xs text-muted">{t("from")}</span><input type="date" value={range[0]} onChange={(e) => e.target.value && setRange([e.target.value, range[1]])} className="h-10 rounded-lg border border-border bg-background px-3" /></label>
              <label className="text-sm"><span className="mb-1 block text-xs text-muted">{t("to")}</span><input type="date" value={range[1]} onChange={(e) => e.target.value && setRange([range[0], e.target.value])} className="h-10 rounded-lg border border-border bg-background px-3" /></label>
              <a href={`/api/staff/accounting/journal?${new URLSearchParams({ key: key ?? "", from: range[0], to: range[1], format: "csv" })}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:border-teal"><Download className="h-4 w-4" aria-hidden />{t("downloadJournal")}</a>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
