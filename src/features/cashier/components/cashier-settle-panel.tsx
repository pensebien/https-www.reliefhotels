"use client";

import { useSettlePayment } from "@/features/cashier/hooks/use-settle-payment";
import {
  computeNights,
  formatCashierDate,
  guestFullName,
  suggestedDepositNgn,
} from "@/features/cashier/lib/helpers";
import type {
  CashierPaymentMethod,
  CashierReservation,
} from "@/features/cashier/types";
import { cn, formatNaira } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const PAYMENT_METHODS: CashierPaymentMethod[] = [
  "cash",
  "paystack_terminal",
  "moniepoint_terminal",
  "moniepoint_transfer",
];

export function CashierSettlePanel({
  reservation,
  cashierKey,
  onSettled,
  onBack,
}: {
  reservation: CashierReservation;
  cashierKey: string;
  onSettled: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("cashier");
  const suggested = suggestedDepositNgn(reservation);
  const nights = computeNights(reservation);

  const [amount, setAmount] = useState<string>(
    suggested ? String(suggested) : "",
  );
  const [method, setMethod] = useState<CashierPaymentMethod | null>(null);
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { stage, error, notDeployed, result, submit, reset } =
    useSettlePayment(cashierKey);

  useEffect(() => {
    setAmount(suggested ? String(suggested) : "");
    setMethod(null);
    setNote("");
    setValidationError(null);
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation.id]);

  const busy = stage === "submitting" || stage === "polling";

  function handleSubmit() {
    const amountNgn = Number(amount);
    if (!amountNgn || amountNgn <= 0) {
      setValidationError(t("amountRequired"));
      return;
    }
    if (!method) {
      setValidationError(t("methodRequired"));
      return;
    }
    setValidationError(null);
    submit({
      reservationId: reservation.id,
      amountNgn,
      paymentMethod: method,
      note: note.trim() || undefined,
    });
  }

  if (stage === "success") {
    return (
      <div className="rounded-xl border border-teal/40 bg-teal/10 p-6 text-sm">
        <p className="font-medium text-teal-dark">{t("success")}</p>
        {result?.reference ? (
          <p className="mt-1 text-xs text-muted">
            {t("reference")}: {result.reference}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onSettled}
          className="mt-4 rounded-full bg-teal px-4 py-2 text-sm font-medium text-gray-950 hover:bg-teal-dark"
        >
          {t("backToQueue")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{t("guestLabel")}</p>
          <p className="font-medium">{guestFullName(reservation)}</p>
          <p className="text-sm text-muted">{reservation.email}</p>
          {reservation.phone ? (
            <p className="text-sm text-muted">{reservation.phone}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:border-teal disabled:opacity-50"
        >
          {t("changeSelection")}
        </button>
      </div>

      {reservation.checkIn ? (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border/70 bg-background/60 p-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted">{t("checkIn")}</p>
            <p>{formatCashierDate(reservation.checkIn)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("checkOut")}</p>
            <p>{formatCashierDate(reservation.checkOut)}</p>
          </div>
          {nights ? (
            <div>
              <p className="text-xs text-muted">{t("stayLabel")}</p>
              <p>{t("nights", { count: nights })}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5">
        <label className="mb-1 block text-sm font-medium" htmlFor="cashier-amount">
          {t("amountLabel")}
        </label>
        <input
          id="cashier-amount"
          type="number"
          min={0}
          step={100}
          value={amount}
          disabled={busy}
          onChange={(e) => setAmount(e.target.value)}
          className="h-10 w-full max-w-xs rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60"
        />
        {suggested ? (
          <p className="mt-1 text-xs text-muted">
            {t("suggestedAmount", { amount: formatNaira(suggested) })}
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium">{t("paymentMethod")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PAYMENT_METHODS.map((option) => (
            <button
              key={option}
              type="button"
              disabled={busy}
              onClick={() => setMethod(option)}
              aria-pressed={method === option}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-60",
                method === option
                  ? "border-teal bg-teal text-gray-950"
                  : "border-border bg-background hover:border-teal/60",
              )}
            >
              {t(`methods.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-1 block text-sm font-medium" htmlFor="cashier-note">
          {t("noteLabel")}
        </label>
        <input
          id="cashier-note"
          type="text"
          value={note}
          disabled={busy}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("notePlaceholder")}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60"
        />
      </div>

      {(validationError || error) && (
        <p className="mt-4 text-sm text-red-600">
          {notDeployed ? t("notDeployed") : validationError ?? error}
        </p>
      )}

      {stage === "polling" && (
        <p className="mt-4 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden />
          {t("polling")}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-gray-950 hover:bg-teal-dark disabled:opacity-60"
        >
          {stage === "submitting"
            ? t("submitting")
            : stage === "polling"
              ? t("polling")
              : t("submit")}
        </button>
        {stage === "failed" && (
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
          >
            {t("tryAgain")}
          </button>
        )}
      </div>
    </div>
  );
}
