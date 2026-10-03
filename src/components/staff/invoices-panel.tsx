"use client";

import { Link } from "@/i18n/navigation";
import { formatNaira } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Summary = { id: string; number: string; kind: "invoice" | "credit_note"; issuedAt: string; totalNgn: number };

/** Invoices and credit notes for one booking, with "Issue invoice". */
export function InvoicesPanel({ reservationId, dashboardKey }: { reservationId: string; dashboardKey: string }) {
  const t = useTranslations("demo.invoices");
  const [invoices, setInvoices] = useState<Summary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/staff/reservations/${encodeURIComponent(reservationId)}/invoices?key=${encodeURIComponent(dashboardKey)}`;

  const load = useCallback(async () => {
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (res.ok) setInvoices(body.invoices);
    else setError(body?.error ?? t("error"));
  }, [t, url]);

  useEffect(() => {
    load();
  }, [load]);

  async function issue() {
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method: "POST" });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) setError(body?.error ?? t("error"));
    else load();
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("title")}</p>
      {invoices && invoices.length === 0 ? <p className="text-sm text-muted">{t("none")}</p> : null}
      {invoices?.length ? (
        <ul className="space-y-1 text-sm">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-2">
              <Link
                href={{ pathname: `/staff/invoices/${inv.id}`, query: { key: dashboardKey } }}
                className="font-mono text-teal-dark underline-offset-2 hover:underline"
              >
                {inv.number}
              </Link>
              <span className="text-xs text-muted">{inv.kind === "credit_note" ? t("creditNote") : t("invoice")}</span>
              <span className="tabular-nums">{formatNaira(inv.totalNgn)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={issue}
        disabled={busy}
        className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-teal disabled:opacity-50"
      >
        {busy ? t("issuing") : t("issue")}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
