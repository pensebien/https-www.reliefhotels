"use client";

import { InvoiceView, type InvoiceViewData } from "@/components/invoice-view";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";

type Loaded = { invoice: InvoiceViewData & { id: string; creditForId?: string }; guestUrl: string | null };

export function StaffInvoiceClient({ invoiceId }: { invoiceId: string }) {
  const t = useTranslations("staffInvoice");
  const searchParams = useSearchParams();
  const [key, setKey] = useState<string | null>(null);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [crediting, setCrediting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

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
    const res = await fetch(`/api/staff/invoices/${encodeURIComponent(invoiceId)}${q}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) setError(body?.error ?? t("loadError"));
    else setData(body as Loaded);
  }, [invoiceId, key, q, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function emailGuest() {
    setBusy(true);
    const res = await fetch(`/api/staff/invoices/${encodeURIComponent(invoiceId)}/email${q}`, { method: "POST" });
    const body = await res.json().catch(() => null);
    setBusy(false);
    setNotice(res.ok ? (body?.sent ? t("emailed") : t("emailDemo")) : (body?.error ?? t("actionError")));
  }

  async function creditNote() {
    setBusy(true);
    const res = await fetch(`/api/staff/invoices/${encodeURIComponent(invoiceId)}/credit-note${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setNotice(body?.error ?? t("actionError"));
      return;
    }
    window.location.assign(`./${body.invoice.id}${q}`);
  }

  async function copyLink() {
    if (!data?.guestUrl) return;
    try {
      await navigator.clipboard.writeText(data.guestUrl);
      setNotice(t("copied"));
    } catch {
      setNotice(data.guestUrl);
    }
  }

  if (error) return <p className="text-center text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-center text-muted">{t("loading")}</p>;

  const isInvoice = data.invoice.kind === "invoice";

  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 print:hidden">
        <Link
          href={{ pathname: "/staff/calendar", query: key ? { key } : undefined }}
          className="mr-auto inline-flex items-center gap-2 text-sm text-muted hover:text-teal"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("back")}
        </Link>
        <button type="button" onClick={emailGuest} disabled={busy} className="rounded-full border border-border px-4 py-2 text-sm hover:border-teal disabled:opacity-50">
          {t("email")}
        </button>
        {data.guestUrl ? (
          <button type="button" onClick={copyLink} className="rounded-full border border-border px-4 py-2 text-sm hover:border-teal">
            {t("copyLink")}
          </button>
        ) : null}
        {isInvoice ? (
          <button type="button" onClick={() => setCrediting((v) => !v)} className="rounded-full border border-red-600/40 px-4 py-2 text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
            {t("creditNote")}
          </button>
        ) : null}
      </div>

      {crediting ? (
        <div className="mx-auto max-w-3xl space-y-2 rounded-xl border border-border p-4 print:hidden">
          <label htmlFor="credit-reason" className="block text-sm font-medium">{t("creditReason")}</label>
          <input
            id="credit-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          <p className="text-xs text-muted">{t("creditHint")}</p>
          <button
            type="button"
            onClick={creditNote}
            disabled={busy || reason.trim().length < 3}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {t("issueCredit")}
          </button>
        </div>
      ) : null}

      {notice ? <p className="mx-auto max-w-3xl break-all text-sm text-teal-dark print:hidden">{notice}</p> : null}

      <InvoiceView invoice={data.invoice} />
    </div>
  );
}
