"use client";

import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { Link } from "@/i18n/navigation";
import { formatDocumentNumber, type InvoiceSettings } from "@/lib/invoices/settings";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";
const inputClass = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm";

export function StaffInvoiceSettingsClient() {
  const t = useTranslations("staffInvoiceSettings");
  const searchParams = useSearchParams();
  const [key, setKey] = useState<string | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setKey(
      searchParams.get("key") ??
        (typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_STORAGE_KEY) : null) ??
        DEFAULT_KEY,
    );
  }, [searchParams]);

  const q = key ? `?key=${encodeURIComponent(key)}` : "";

  const load = useCallback(async () => {
    if (key === null) return;
    setLoading(true);
    const res = await fetch(`/api/staff/settings/invoices${q}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) setError(res.status === 401 ? "Invalid dashboard key." : body?.error ?? "Could not load settings.");
    else {
      setError(null);
      setSettings(body.settings);
    }
  }, [key, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(next: InvoiceSettings): Promise<string | null> {
    const res = await fetch(`/api/staff/settings/invoices${q}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return `${body?.error ?? "Save failed"}${body?.issues ? `: ${body.issues.join("; ")}` : ""}`;
    setSettings(body.settings);
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
      <Link
        href={{ pathname: "/staff", query: key ? { key } : undefined }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-teal"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToPortal")}
      </Link>
      <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
      <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
      <p className="mt-2 mb-8 text-muted">{t("subtitle")}</p>
      {key !== null && (
        <StaffCalendarKeyForm
          key={key}
          initialKey={key}
          loading={loading}
          onSubmit={(next) => {
            window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
            setKey(next);
          }}
          placeholder={t("keyPlaceholder")}
          submitLabel={t("unlock")}
        />
      )}
      {error ? <p className="mb-6 text-sm text-red-600">{error}</p> : null}
      {settings ? <SettingsForm key={JSON.stringify(settings)} initial={settings} onSave={save} /> : null}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function SettingsForm({
  initial,
  onSave,
}: {
  initial: InvoiceSettings;
  onSave: (s: InvoiceSettings) => Promise<string | null>;
}) {
  const t = useTranslations("staffInvoiceSettings");
  const [s, setS] = useState(initial);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof InvoiceSettings>(k: K, v: InvoiceSettings[K]) => {
    setS((prev) => ({ ...prev, [k]: v }));
    setStatus(null);
  };
  const year = new Date().getFullYear();
  const num = (v: string) => (v === "" ? 0 : Number(v));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const error = await onSave(s);
    setSaving(false);
    setStatus(error ? { ok: false, message: error } : { ok: true, message: t("saved") });
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="space-y-4 rounded-xl border border-border bg-card/50 p-5">
        <h2 className="font-serif text-xl font-medium">{t("numbering")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("invoiceFormat")} hint={t("example", { number: formatDocumentNumber(s.invoiceFormat || "{id}", 7, s.padding, year) })}>
            <input id="invoice-format" className={inputClass} value={s.invoiceFormat} onChange={(e) => set("invoiceFormat", e.target.value)} />
          </Field>
          <Field label={t("creditFormat")} hint={t("example", { number: formatDocumentNumber(s.creditNoteFormat || "{id}", 7, s.padding, year) })}>
            <input id="credit-format" className={inputClass} value={s.creditNoteFormat} onChange={(e) => set("creditNoteFormat", e.target.value)} />
          </Field>
          <Field label={t("padding")}>
            <input id="padding" type="number" min={0} max={8} className={inputClass} value={s.padding} onChange={(e) => set("padding", num(e.target.value))} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input id="reset-yearly" type="checkbox" className="h-4 w-4 accent-teal" checked={s.resetYearly} onChange={(e) => set("resetYearly", e.target.checked)} />
            {t("resetYearly")}
          </label>
        </div>
        <p className="text-xs text-muted">{t("formatHint")}</p>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card/50 p-5">
        <h2 className="font-serif text-xl font-medium">{t("taxAndTerms")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("roomVat")}>
            <input id="room-vat" type="number" min={0} max={100} step="any" className={inputClass} value={s.roomVatPct} onChange={(e) => set("roomVatPct", num(e.target.value))} />
          </Field>
          <Field label={t("extrasVat")}>
            <input id="extras-vat" type="number" min={0} max={100} step="any" className={inputClass} value={s.extrasVatPct} onChange={(e) => set("extrasVatPct", num(e.target.value))} />
          </Field>
          <Field label={t("terms")}>
            <input id="terms" type="number" min={0} max={90} className={inputClass} value={s.paymentTermsDays} onChange={(e) => set("paymentTermsDays", num(e.target.value))} />
          </Field>
        </div>
        <p className="text-xs text-muted">{t("vatHint")}</p>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card/50 p-5">
        <h2 className="font-serif text-xl font-medium">{t("payee")}</h2>
        <Field label={t("payeeName")}>
          <input id="payee-name" className={inputClass} value={s.payeeName} onChange={(e) => set("payeeName", e.target.value)} />
        </Field>
        <Field label={t("payeeAddress")}>
          <textarea id="payee-address" rows={2} className={`${inputClass} h-auto py-2`} value={s.payeeAddress} onChange={(e) => set("payeeAddress", e.target.value)} />
        </Field>
        <Field label={t("taxId")}>
          <input id="tax-id" className={inputClass} value={s.payeeTaxId} onChange={(e) => set("payeeTaxId", e.target.value)} />
        </Field>
        <Field label={t("bank")} hint={t("bankHint")}>
          <textarea id="bank" rows={3} className={`${inputClass} h-auto py-2`} value={s.bankDetails} onChange={(e) => set("bankDetails", e.target.value)} />
        </Field>
        <Field label={t("footer")}>
          <input id="footer" className={inputClass} value={s.footer} onChange={(e) => set("footer", e.target.value)} />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950 disabled:opacity-60">
          {saving ? t("saving") : t("save")}
        </button>
        {status ? <span className={status.ok ? "text-sm text-teal-dark" : "text-sm text-red-600"}>{status.message}</span> : null}
      </div>
    </form>
  );
}
