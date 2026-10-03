"use client";

import type { CheckinSettings } from "@/lib/checkin/settings";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";

const input = "h-9 rounded-lg border border-border bg-background px-2 text-sm";

/** Online check-in options (opens N days before, ID photo, message, ID retention). */
export function CheckinSettingsSection({ query }: { query: string }) {
  const t = useTranslations("staffMessages.checkinSettings");
  const [s, setS] = useState<CheckinSettings | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/staff/settings/checkin${query}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && body?.settings) setS(body.settings);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!s) return null;
  const set = <K extends keyof CheckinSettings>(k: K, v: CheckinSettings[K]) => {
    setS({ ...s, [k]: v });
    setStatus(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/staff/settings/checkin${query}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const body = await res.json().catch(() => null);
    setSaving(false);
    setStatus(res.ok ? { ok: true, text: t("saved") } : { ok: false, text: body?.error ?? t("error") });
  }

  return (
    <form onSubmit={submit} className="mt-10 space-y-4 rounded-xl border border-border bg-card/50 p-5" aria-labelledby="checkin-settings">
      <h2 id="checkin-settings" className="font-serif text-xl font-medium">{t("title")}</h2>
      <p className="text-sm text-muted">{t("subtitle")}</p>
      <label className="flex items-center gap-2 text-sm">
        <input id="ci-enabled" type="checkbox" className="h-4 w-4 accent-teal" checked={s.enabled} onChange={(e) => set("enabled", e.target.checked)} />
        {t("enabled")}
      </label>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>{t("opens")}</span>
        <input id="ci-opens" type="number" min={0} max={30} value={s.opensDaysBefore} onChange={(e) => set("opensDaysBefore", Math.max(0, Math.min(30, Number(e.target.value) || 0)))} className={`${input} w-16`} aria-label={t("opensAria")} />
        <span>{t("opensAfter")}</span>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input id="ci-photo" type="checkbox" className="h-4 w-4 accent-teal" checked={s.requireIdPhoto} onChange={(e) => set("requireIdPhoto", e.target.checked)} />
        {t("requirePhoto")}
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{t("instructions")}</span>
        <textarea id="ci-instructions" rows={3} value={s.instructions} onChange={(e) => set("instructions", e.target.value)} className="w-full rounded-lg border border-border bg-background p-2" />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>{t("retention")}</span>
        <input id="ci-retention" type="number" min={1} max={365} value={s.retentionDays} onChange={(e) => set("retentionDays", Math.max(1, Math.min(365, Number(e.target.value) || 1)))} className={`${input} w-20`} aria-label={t("retentionAria")} />
        <span>{t("retentionAfter")}</span>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950 disabled:opacity-60">
          {saving ? t("saving") : t("save")}
        </button>
        {status ? <span className={status.ok ? "text-sm text-teal-dark" : "text-sm text-red-600"} role="status">{status.text}</span> : null}
      </div>
    </form>
  );
}
