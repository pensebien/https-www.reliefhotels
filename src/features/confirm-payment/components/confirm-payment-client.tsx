"use client";

import { formatNaira } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type ConfirmPaymentView = {
  id: string;
  token: string;
  ref: string;
  guest: string;
  whatsapp: string | null;
  room: string;
  checkIn: string | null;
  checkOut: string | null;
  amountDueNgn: number;
  status: "pending" | "confirmed" | "cancelled" | "checked_out";
  holdExpired: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
};

const inputClassName =
  "h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20";

export function ConfirmPaymentClient({ view }: { view: ConfirmPaymentView | null }) {
  const t = useTranslations("confirmPayment");
  const [amount, setAmount] = useState(String(view?.amountDueNgn ?? ""));
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!view) {
    return <p className="rounded-xl border border-red-300 p-4 text-red-700 dark:text-red-300">{t("invalid")}</p>;
  }

  const confirmed = Boolean(done) || view.status === "confirmed" || view.status === "checked_out";
  const amountNgn = Number.parseInt(amount.replace(/[^\d]/g, ""), 10);
  const mismatch = Number.isFinite(amountNgn) && amountNgn !== view.amountDueNgn;

  async function confirm() {
    if (!view || !Number.isFinite(amountNgn) || amountNgn <= 0) {
      setError(t("invalidAmount"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: view.id, t: view.token, amountNgn, ...(ref.trim() ? { moniepointRef: ref.trim() } : {}) }),
      });
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? t("error"));
      setDone(body?.message ?? t("done"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <dl className="space-y-3 rounded-2xl border border-border bg-card p-5 text-sm">
        <Row label={t("reference")} value={`#${view.ref}`} mono />
        <Row label={t("guest")} value={view.guest} />
        {view.whatsapp ? <Row label={t("whatsapp")} value={`+${view.whatsapp}`} /> : null}
        <Row label={t("room")} value={view.room} />
        {view.checkIn && view.checkOut ? <Row label={t("stay")} value={`${view.checkIn} → ${view.checkOut}`} /> : null}
        <Row label={t("expected")} value={formatNaira(view.amountDueNgn)} strong />
      </dl>

      {view.status === "cancelled" ? (
        <p role="status" className="rounded-xl border border-border p-4">{t("cancelled")}</p>
      ) : confirmed ? (
        <div role="status" className="rounded-2xl border-2 border-teal/30 bg-teal/5 p-5">
          <p className="flex items-center gap-2 font-medium">
            <Check className="h-5 w-5" aria-hidden />
            {done ?? t("alreadyConfirmed")}
          </p>
          {!done && view.confirmedBy && view.confirmedAt ? (
            <p className="mt-1 text-xs text-muted">
              {t("confirmedBy", { name: view.confirmedBy, at: new Date(view.confirmedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) })}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="rounded-xl bg-amber-500/10 p-4 text-sm">{t("checkFirst")}</p>
          {view.holdExpired ? <p className="text-sm text-red-700 dark:text-red-300">{t("holdExpired")}</p> : null}
          <div className="space-y-2">
            <label htmlFor="cp-amount" className="text-xs font-medium uppercase tracking-wider text-muted">{t("amountReceived")}</label>
            <input id="cp-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClassName} />
            {mismatch ? <p className="text-xs text-amber-700 dark:text-amber-300">{t("amountMismatch", { expected: formatNaira(view.amountDueNgn) })}</p> : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="cp-ref" className="text-xs font-medium uppercase tracking-wider text-muted">{t("moniepointRef")}</label>
            <input id="cp-ref" value={ref} onChange={(e) => setRef(e.target.value)} className={inputClassName} />
          </div>
          {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal px-6 py-3.5 text-sm font-medium text-gray-950 hover:bg-teal-dark disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
            {t("confirmButton")}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`${mono ? "font-mono" : ""} ${strong ? "font-semibold" : "font-medium"} text-right`}>{value}</dd>
    </div>
  );
}
