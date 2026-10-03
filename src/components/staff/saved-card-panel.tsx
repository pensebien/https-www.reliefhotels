"use client";

import { formatNaira } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type CardInfo = {
  card: { brand: string; last4: string; expMonth: string; expYear: string } | null;
  consent: boolean;
  balanceNgn: number;
};

/** Manager-only: charge the guest's saved card, up to the outstanding balance. */
export function SavedCardPanel({ reservationId, dashboardKey }: { reservationId: string; dashboardKey: string }) {
  const t = useTranslations("demo.savedCard");
  const [info, setInfo] = useState<CardInfo | null>(null);
  const [hidden, setHidden] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const url = `/api/staff/reservations/${encodeURIComponent(reservationId)}/card?key=${encodeURIComponent(dashboardKey)}`;

  const load = useCallback(async () => {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 403) {
      setHidden(true);
      return;
    }
    if (res.ok) setInfo(await res.json());
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  if (hidden || !info || (!info.card && !info.consent)) return null;

  const amountNgn = Number(amount);
  const valid = Number.isInteger(amountNgn) && amountNgn > 0 && amountNgn <= info.balanceNgn && reason.trim().length >= 3;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("title")}</p>
      {!info.card ? (
        <p className="text-muted">{t("none")}</p>
      ) : (
        <>
          <p>
            {t("summary", { brand: info.card.brand.toUpperCase(), last4: info.card.last4, exp: `${info.card.expMonth}/${info.card.expYear.slice(-2)}` })}
          </p>
          <p className="text-muted">{t("balance", { amount: formatNaira(info.balanceNgn) })}</p>
          <div className="flex flex-wrap gap-2">
            <input
              id={`card-amount-${reservationId}`}
              type="number"
              min={1}
              max={info.balanceNgn}
              aria-label={t("amount")}
              placeholder={t("amount")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 w-32 rounded-lg border border-border bg-background px-2"
            />
            <input
              id={`card-reason-${reservationId}`}
              aria-label={t("reason")}
              placeholder={t("reason")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2"
            />
          </div>
          <button
            type="button"
            disabled={busy || !valid}
            onClick={async () => {
              setBusy(true);
              setMessage(null);
              const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amountNgn, reason }),
              });
              const body = await res.json().catch(() => null);
              setBusy(false);
              if (!res.ok) setMessage({ ok: false, text: body?.error ?? t("error") });
              else {
                setMessage({ ok: true, text: body.status === "pending" ? t("pending") : t("done") });
                setAmount("");
                setReason("");
                load();
              }
            }}
            className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-teal disabled:opacity-50"
          >
            {busy ? t("working") : t("charge")}
          </button>
        </>
      )}
      {message ? <p className={message.ok ? "text-xs text-teal-dark" : "text-xs text-red-600"}>{message.text}</p> : null}
    </div>
  );
}
