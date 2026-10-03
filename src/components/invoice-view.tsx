"use client";

import type { InvoiceDocument } from "@/lib/invoices/build";
import { formatNaira } from "@/lib/utils";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

export type InvoiceViewData = {
  number: string;
  kind: "invoice" | "credit_note";
  issuedAt: string;
  dueAt: string;
  document: InvoiceDocument;
};

const METHOD_LABELS: Record<string, string> = {
  paystack: "Paystack (online)",
  cash: "Cash",
  moniepoint_terminal: "Card (Moniepoint POS)",
  moniepoint_transfer: "Bank transfer (Moniepoint)",
  paystack_terminal: "Card (Paystack POS)",
  paid_at_outlet: "Paid at outlet",
};

function date(iso?: string) {
  if (!iso) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Printable invoice / credit note. The browser's print dialog saves it as PDF. */
export function InvoiceView({ invoice }: { invoice: InvoiceViewData }) {
  const t = useTranslations("invoiceView");
  const doc = invoice.document;
  const credit = invoice.kind === "credit_note";

  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 text-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-serif text-2xl font-semibold">{doc.payee.name}</p>
          {doc.payee.address ? <p className="mt-1 whitespace-pre-line text-muted">{doc.payee.address}</p> : null}
          {doc.payee.taxId ? <p className="text-muted">{t("taxId", { id: doc.payee.taxId })}</p> : null}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-dark">
            {credit ? t("creditNote") : t("invoice")}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold">{invoice.number}</p>
          <p className="text-muted">{t("issued", { date: date(invoice.issuedAt) })}</p>
          {!credit ? (
            <p className="text-muted">
              {doc.paymentTermsDays === 0 ? t("dueOnReceipt") : t("due", { date: date(invoice.dueAt) })}
            </p>
          ) : null}
        </div>
      </div>

      {credit && doc.creditFor ? (
        <p className="mt-6 rounded-lg bg-muted/10 px-4 py-3">
          {t("reverses", { number: doc.creditFor.number })}
          {doc.reason ? ` ${t("reason", { reason: doc.reason })}` : ""}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{t("billedTo")}</p>
          <p className="mt-1 font-medium">{doc.guest.name}</p>
          <p className="text-muted">{doc.guest.email}</p>
          {doc.guest.phone ? <p className="text-muted">{doc.guest.phone}</p> : null}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{t("stay")}</p>
          <p className="mt-1 font-medium">
            {doc.reservation.roomLabel}
            {doc.reservation.roomNumbers.length ? ` · ${t("roomNumbers", { rooms: doc.reservation.roomNumbers.join(", ") })}` : ""}
          </p>
          <p className="text-muted">
            {date(doc.reservation.checkIn)} → {date(doc.reservation.checkOut)}
          </p>
          <p className="font-mono text-xs text-muted">{t("booking", { id: doc.reservation.id.slice(0, 8).toUpperCase() })}</p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-2 pr-3 font-medium">{t("item")}</th>
              <th className="py-2 pr-3 text-right font-medium">{t("qty")}</th>
              <th className="py-2 pr-3 text-right font-medium">{t("unit")}</th>
              <th className="py-2 pr-3 text-right font-medium">{t("vat")}</th>
              <th className="py-2 text-right font-medium">{t("amount")}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {doc.lines.map((line, i) => (
              <tr key={i} className="border-b border-border/60 align-top">
                <td className="py-2 pr-3">{line.description}</td>
                <td className="py-2 pr-3 text-right">{line.quantity}</td>
                <td className="py-2 pr-3 text-right">{formatNaira(line.unitPriceNgn)}</td>
                <td className="py-2 pr-3 text-right">{line.vatPct ? `${line.vatPct}%` : "—"}</td>
                <td className="py-2 text-right">{formatNaira(line.amountNgn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-6 grid max-w-xs grid-cols-2 gap-y-1 tabular-nums">
        <dt className="text-muted">{t("net")}</dt>
        <dd className="text-right">{formatNaira(doc.totals.netNgn)}</dd>
        <dt className="text-muted">{t("vatTotal")}</dt>
        <dd className="text-right">{formatNaira(doc.totals.vatNgn)}</dd>
        <dt className="border-t border-border pt-1 font-semibold">{t("total")}</dt>
        <dd className="border-t border-border pt-1 text-right font-semibold">{formatNaira(doc.totals.grossNgn)}</dd>
        {!credit ? (
          <>
            <dt className="text-muted">{t("paid")}</dt>
            <dd className="text-right">{formatNaira(doc.totals.paidNgn)}</dd>
            <dt className="font-semibold text-teal-dark">{t("balance")}</dt>
            <dd className="text-right font-semibold text-teal-dark">{formatNaira(doc.totals.balanceNgn)}</dd>
          </>
        ) : null}
      </dl>

      {!credit && doc.payments.length ? (
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{t("payments")}</p>
          <ul className="mt-2 divide-y divide-border/60 tabular-nums">
            {doc.payments.map((p) => (
              <li key={p.reference} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span>
                  {date(p.date)} · {METHOD_LABELS[p.method] ?? p.method}{" "}
                  <span className="font-mono text-xs text-muted">{p.reference}</span>
                </span>
                <span>{formatNaira(p.amountNgn)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {doc.payee.bankDetails && !credit && doc.totals.balanceNgn > 0 ? (
        <div className="mt-8 rounded-lg bg-muted/10 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{t("payTo")}</p>
          <p className="mt-1 whitespace-pre-line">{doc.payee.bankDetails}</p>
        </div>
      ) : null}

      {doc.footer ? <p className="mt-8 text-center text-muted">{doc.footer}</p> : null}

      <div className="mt-8 flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-teal"
        >
          <Printer className="h-4 w-4" aria-hidden />
          {t("print")}
        </button>
      </div>
    </article>
  );
}
