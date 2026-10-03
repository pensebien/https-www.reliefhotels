"use client";

import type { BookingLink } from "@/lib/booking-engine/booking-links";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const input = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm";

type Options = { rooms: { id: string; name: string }[]; ratePlans: { id: string; label: string }[]; coupons: string[] };

/** Shareable booking links: /go/<name> with preset room types, promo code and rate plan. */
export function BookingLinksEditor({ query, onNotice }: { query: string; onNotice: (text: string) => void }) {
  const t = useTranslations("staffIntegrations");
  const [links, setLinks] = useState<BookingLink[] | null>(null);
  const [options, setOptions] = useState<Options>({ rooms: [], ratePlans: [], coupons: [] });

  const load = useCallback(async () => {
    const res = await fetch(`/api/staff/settings/booking-links${query}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = await res.json();
    setLinks(body.links);
    setOptions({ rooms: body.rooms, ratePlans: body.ratePlans, coupons: body.coupons });
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  if (!links) return null;
  const update = (i: number, change: Partial<BookingLink>) => setLinks(links.map((l, j) => (j === i ? { ...l, ...change } : l)));
  const urlFor = (slug: string) => `${window.location.origin}/go/${slug}`;

  async function save() {
    const res = await fetch(`/api/staff/settings/booking-links${query}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ links: links!.map((l) => ({ ...l, couponCode: l.couponCode || undefined, ratePlanId: l.ratePlanId || undefined })) }),
    });
    const body = await res.json().catch(() => null);
    onNotice(res.ok ? t("saved") : body?.error ?? t("error"));
    if (res.ok) setLinks(body.links);
  }

  async function copy(slug: string) {
    try {
      await navigator.clipboard.writeText(urlFor(slug));
      onNotice(t("copied"));
    } catch {
      onNotice(urlFor(slug));
    }
  }

  return (
    <section aria-labelledby="booking-links" className="space-y-3">
      <h2 id="booking-links" className="font-serif text-xl font-medium">{t("linksTitle")}</h2>
      <p className="text-sm text-muted">{t("linksHint")}</p>
      {links.map((link, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">{t("linkLabel")}</span>
              <input value={link.label} placeholder={t("linkLabelPlaceholder")} onChange={(e) => update(i, { label: e.target.value })} className={input} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">{t("linkSlug")}</span>
              <input value={link.slug} placeholder="acme-corporate" onChange={(e) => update(i, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className={input} />
            </label>
            <div className="flex items-end gap-2 pb-1">
              <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-teal" checked={link.active} onChange={(e) => update(i, { active: e.target.checked })} />{t("on")}</label>
              <button type="button" aria-label={t("remove")} onClick={() => setLinks(links.filter((_, j) => j !== i))} className="rounded p-1.5 text-muted hover:text-red-600"><Trash2 className="h-4 w-4" aria-hidden /></button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">{t("linkCoupon")}</span>
              <select value={link.couponCode ?? ""} onChange={(e) => update(i, { couponCode: e.target.value || undefined })} className={input}>
                <option value="">{t("none")}</option>
                {options.coupons.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted">{t("linkRatePlan")}</span>
              <select value={link.ratePlanId ?? ""} onChange={(e) => update(i, { ratePlanId: e.target.value || undefined })} className={input}>
                <option value="">{t("standardRate")}</option>
                {options.ratePlans.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
          </div>
          <fieldset className="text-sm">
            <legend className="mb-1 text-xs text-muted">{t("linkRooms")}</legend>
            <div className="flex flex-wrap gap-3">
              {options.rooms.map((r) => (
                <label key={r.id} className="flex items-center gap-1.5">
                  <input type="checkbox" className="h-4 w-4 accent-teal" checked={link.roomIds.includes(r.id)} onChange={(e) => update(i, { roomIds: e.target.checked ? [...link.roomIds, r.id] : link.roomIds.filter((x) => x !== r.id) })} />
                  {r.name}
                </label>
              ))}
            </div>
          </fieldset>
          {link.slug.length >= 2 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <code className="min-w-0 flex-1 truncate rounded bg-muted/10 px-2 py-1">/go/{link.slug}</code>
              <button type="button" onClick={() => copy(link.slug)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 hover:border-teal"><Copy className="h-3.5 w-3.5" aria-hidden />{t("copyLink")}</button>
            </div>
          ) : null}
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setLinks([...links, { slug: "", label: "", roomIds: [], active: true }])} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-teal"><Plus className="h-4 w-4" aria-hidden />{t("addLink")}</button>
        <button type="button" onClick={save} className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950">{t("saveLinks")}</button>
      </div>
    </section>
  );
}
