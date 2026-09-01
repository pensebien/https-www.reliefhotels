"use client";

import {
  SETTLE_POLL_TIMEOUT_SECONDS,
  useSettlePayment,
} from "@/features/cashier/hooks/use-settle-payment";
import {
  computeNights,
  formatCashierDate,
  guestFullName,
  suggestedDepositNgn,
} from "@/features/cashier/lib/helpers";
import type {
  CashierMoniepointConfig,
  CashierPaymentMethod,
  CashierPaystackTerminalConfig,
  CashierReservation,
} from "@/features/cashier/types";
import { resolveCardTerminalMethod } from "@/lib/payment-methods";
import { formatCountdown, useCountdown } from "@/lib/use-countdown";
import { cn, formatNaira } from "@/lib/utils";
import { ArrowLeftRight, Banknote, CreditCard, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type SettleTile = {
  group: "cash" | "card" | "transfer";
  method: CashierPaymentMethod;
  icon: typeof Banknote;
};

export function CashierSettlePanel({
  reservation,
  cashierKey,
  moniepointConfig,
  paystackTerminalConfig,
  onSettled,
  onBack,
}: {
  reservation: CashierReservation;
  cashierKey: string;
  moniepointConfig?: CashierMoniepointConfig;
  paystackTerminalConfig?: CashierPaystackTerminalConfig;
  onSettled: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("cashier");
  const suggested = suggestedDepositNgn(reservation);
  const nights = computeNights(reservation);

  const cardMethod = resolveCardTerminalMethod({
    paystackTerminalConfigured: paystackTerminalConfig?.configured ?? false,
    moniepointTerminalConfigured: moniepointConfig?.terminalConfigured ?? false,
  });

  const tiles: SettleTile[] = [
    { group: "cash", method: "cash", icon: Banknote },
    { group: "card", method: cardMethod, icon: CreditCard },
    { group: "transfer", method: "moniepoint_transfer", icon: ArrowLeftRight },
  ];

  const [amount, setAmount] = useState<string>(
    suggested ? String(suggested) : "",
  );
  const [pendingMethod, setPendingMethod] = useState<CashierPaymentMethod | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { stage, error, notDeployed, result, submit, reset } =
    useSettlePayment(cashierKey);

  useEffect(() => {
    setAmount(suggested ? String(suggested) : "");
    setPendingMethod(null);
    setNote("");
    setShowNote(false);
    setValidationError(null);
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation.id]);

  const busy = stage === "submitting" || stage === "polling";
  const amountNgn = Number(amount);
  const amountValid = Boolean(amountNgn) && amountNgn > 0;

  const pollSecondsRemaining = useCountdown(
    stage === "polling",
    SETTLE_POLL_TIMEOUT_SECONDS,
  );

  function handleSettle(method: CashierPaymentMethod) {
    if (busy) return;
    if (!amountValid) {
      setValidationError(t("amountRequired"));
      return;
    }
    setValidationError(null);
    setPendingMethod(method);
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

      {!showNote ? (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          disabled={busy}
          className="mt-3 text-xs font-medium text-teal hover:underline disabled:opacity-60"
        >
          {t("addNote")}
        </button>
      ) : (
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium" htmlFor="cashier-note">
            {t("noteLabel")}
          </label>
          <input
            id="cashier-note"
            type="text"
            autoFocus
            value={note}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-60"
          />
        </div>
      )}

      {(validationError || error) && (
        <p className="mt-4 text-sm text-red-600">
          {notDeployed ? t("notDeployed") : validationError ?? error}
        </p>
      )}

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium">
          {suggested || amountValid
            ? t("settleVia", { amount: formatNaira(amountNgn || suggested || 0) })
            : t("paymentMethod")}
        </p>

        {busy ? (
          <div className="flex items-center gap-3 rounded-lg border border-teal/40 bg-teal/5 px-4 py-4 text-sm">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-teal" aria-hidden />
            <div>
              <p className="font-medium">
                {stage === "submitting"
                  ? t("submitting")
                  : pendingMethod === "moniepoint_transfer"
                    ? t("waitingTransfer")
                    : t("waitingCard")}
              </p>
              {stage === "polling" ? (
                <p className="mt-0.5 font-mono text-xs tabular-nums text-muted" aria-live="polite">
                  {t("timeRemaining", { time: formatCountdown(pollSecondsRemaining) })}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {tiles.map(({ group, method, icon: Icon }) => (
              <button
                key={group}
                type="button"
                disabled={!amountValid}
                onClick={() => handleSettle(method)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-4 text-sm font-medium transition-colors hover:border-teal/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-40 disabled:hover:border-border",
                )}
              >
                <Icon className="h-5 w-5 text-teal" aria-hidden />
                {t(`methods.${group}`)}
                <span className="text-xs font-normal text-muted">
                  {t(`methods.${group}Hint`)}
                </span>
              </button>
            ))}
          </div>
        )}
        {!amountValid ? (
          <p className="mt-2 text-xs text-muted">{t("enterAmountFirst")}</p>
        ) : null}
      </div>

      {stage === "failed" && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => {
              reset();
              setPendingMethod(null);
            }}
            className="rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
          >
            {t("tryAgain")}
          </button>
        </div>
      )}
    </div>
  );
}
