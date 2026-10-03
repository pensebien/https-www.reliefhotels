"use client";

import { formatNaira } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Refundable = {
  reference: string;
  method: string;
  paidNgn: number;
  refundedNgn: number;
  refundableNgn: number;
  viaPaystack: boolean;
};
type PastRefund = { reference: string; refundOf?: string; amountNgn: number; status: string };

/** Manager-only: refund part or all of a payment on this booking. */
export function RefundsPanel({ reservationId, dashboardKey }: { reservationId: string; dashboardKey: string }) {
  const t = useTranslations("demo.refunds");
  const [data, setData] = useState<{ payments: Refundable[]; refunds: PastRefund[] } | null>(null);
  const [hidden, setHidden] = useState(false);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const url = `/api/staff/reservations/${encodeURIComponent(reservationId)}/refunds?key=${encodeURIComponent(dashboardKey)}`;

  const load = useCallback(async () => {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 403) {
      setHidden(true); // not a manager
      return;
    }
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setData(body);
      const first = (body.payments as Refundable[]).find((p) => p.refundableNgn > 0);
      setReference((prev) => prev || first?.reference || "");
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  if (hidden || !data || data.payments.length === 0) return null;

  const selected = data.payments.find((p) => p.reference === reference);
  const amountNgn = Number(amount);
  const valid = selected && Number.isInteger(amountNgn) && amountNgn > 0 && amountNgn <= selected.refundableNgn && reason.trim().length >= 3;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentReference: reference, amountNgn, reason }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage({ ok: false, text: body?.error ?? t("error") });
      return;
    }
    setMessage({
      ok: true,
      text: body.viaPaystack ? (body.status === "pending" ? t("pendingPaystack") : t("donePaystack")) : t("doneManual"),
    });
    setAmount("");
    setReason("");
    load();
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("title")}</p>
      <select
        id={`refund-payment-${reservationId}`}
        aria-label={t("payment")}
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm"
      >
        {data.payments.map((p) => (
          <option key={p.reference} value={p.reference} disabled={p.refundableNgn === 0}>
            {p.reference} · {t("paidLeft", { paid: formatNaira(p.paidNgn), left: formatNaira(p.refundableNgn) })}
          </option>
        ))}
      </select>
      {selected ? (
        <p className="text-xs text-muted">{selected.viaPaystack ? t("viaPaystack") : t("byHand")}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input
          id={`refund-amount-${reservationId}`}
          type="number"
          min={1}
          max={selected?.refundableNgn}
          inputMode="numeric"
          placeholder={t("amount")}
          aria-label={t("amount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 w-32 rounded-lg border border-border bg-background px-2 text-sm"
        />
        <input
          id={`refund-reason-${reservationId}`}
          placeholder={t("reason")}
          aria-label={t("reason")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={busy || !valid}
        className="inline-flex rounded-full border border-red-600/40 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        {busy ? t("working") : t("refund")}
      </button>
      {message ? <p className={message.ok ? "text-xs text-teal-dark" : "text-xs text-red-600"}>{message.text}</p> : null}
      {data.refunds.length ? (
        <ul className="space-y-0.5 border-t border-border/60 pt-2 text-xs text-muted">
          {data.refunds.map((r) => (
            <li key={r.reference}>
              {formatNaira(r.amountNgn)} · {r.refundOf} · {t(`status.${r.status}`)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
