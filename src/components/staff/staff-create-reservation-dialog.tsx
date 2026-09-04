"use client";

import { calculateDepositNgn } from "@/lib/booking-deposit";
import { nightsBetween } from "@/lib/booking-search";
import { celebrateSuccess } from "@/lib/celebrate";
import { resolveCardTerminalMethod } from "@/lib/payment-methods";
import type { StaffPaymentOption } from "@/lib/payment-methods";
import { formatCountdown, useCountdown } from "@/lib/use-countdown";
import { isValidYmd, parseYmd, formatYmd, addDays } from "@/lib/reservation-dates";
import { cn, formatNaira } from "@/lib/utils";
import { Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type StaffRoomOption = {
  id: string;
  label: string;
  priceFrom: number;
};

export type MoniepointPublicConfig = {
  configured: boolean;
  terminalConfigured: boolean;
  demoMode: boolean;
  transferAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  } | null;
};

export type PaystackTerminalPublicConfig = {
  configured: boolean;
  demoMode: boolean;
};

export type BankTransferPublicConfig = {
  configured: boolean;
  account: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  } | null;
};

/** Front-desk payment options grouped the way staff pick them. */
type UiPaymentGroup = "none" | "cash" | "card" | "transfer" | "bankTransferManual";

const UI_PAYMENT_GROUPS: UiPaymentGroup[] = [
  "none",
  "cash",
  "card",
  "transfer",
  "bankTransferManual",
];

function uiGroupForMethod(method: StaffPaymentOption): UiPaymentGroup {
  if (method === "none") return "none";
  if (method === "cash") return "cash";
  if (method === "moniepoint_transfer") return "transfer";
  if (method === "bank_transfer_manual") return "bankTransferManual";
  return "card"; // moniepoint_terminal | paystack_terminal
}

/** How long staff have to complete a bank transfer before the wait screen flags it as expired. */
const TRANSFER_WINDOW_SECONDS = 30 * 60;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  message: string;
  status: "pending" | "confirmed";
  paymentMethod: StaffPaymentOption;
};

const inputClassName =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20";

function defaultCheckOut(checkIn: string): string {
  try {
    const next = new Date(parseYmd(checkIn));
    next.setDate(next.getDate() + 1);
    return formatYmd(next);
  } catch {
    return checkIn;
  }
}

function initialForm(
  roomId: string,
  checkIn: string,
  overrides?: Partial<FormState>,
): FormState {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    roomId,
    checkIn,
    checkOut: defaultCheckOut(checkIn),
    guests: "1",
    message: "",
    status: "confirmed",
    paymentMethod: "cash",
    ...overrides,
  };
}

export type StaffCreateReservationSeed = {
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  status?: "pending" | "confirmed";
  paymentMethod?: StaffPaymentOption;
};

export function StaffCreateReservationDialog({
  open,
  onClose,
  dashboardKey,
  roomOptions,
  moniepointConfig,
  paystackTerminalConfig,
  bankTransferConfig,
  onCreated,
  seed = null,
}: {
  open: boolean;
  onClose: () => void;
  dashboardKey: string;
  roomOptions: StaffRoomOption[];
  moniepointConfig?: MoniepointPublicConfig;
  paystackTerminalConfig?: PaystackTerminalPublicConfig;
  bankTransferConfig?: BankTransferPublicConfig;
  onCreated: () => void;
  /** Prefill when opening from an occupancy calendar free cell. */
  seed?: StaffCreateReservationSeed | null;
}) {
  const t = useTranslations("demo");
  const closeRef = useRef<HTMLButtonElement>(null);
  const today = formatYmd(new Date());

  const cardMethod = resolveCardTerminalMethod({
    paystackTerminalConfigured: paystackTerminalConfig?.configured ?? false,
    moniepointTerminalConfigured: moniepointConfig?.terminalConfigured ?? false,
  });

  const [form, setForm] = useState<FormState>(() =>
    initialForm(roomOptions[0]?.id ?? "", today),
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitingPayment, setWaitingPayment] = useState<{
    reference: string;
    method:
      | "moniepoint_terminal"
      | "moniepoint_transfer"
      | "paystack_terminal"
      | "bank_transfer_manual";
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "success" | "failed" | null
  >(null);
  const [confirmingManually, setConfirmingManually] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const selectedRoom = roomOptions.find((room) => room.id === form.roomId);
  const collectsDeposit = form.paymentMethod !== "none";
  const transferSecondsRemaining = useCountdown(
    waitingPayment?.method === "moniepoint_transfer",
    TRANSFER_WINDOW_SECONDS,
  );
  const transferExpired =
    waitingPayment?.method === "moniepoint_transfer" &&
    transferSecondsRemaining <= 0;

  const nights = useMemo(() => {
    if (!isValidYmd(form.checkIn) || !isValidYmd(form.checkOut)) return 0;
    try {
      if (parseYmd(form.checkOut) <= parseYmd(form.checkIn)) return 0;
      return nightsBetween(form.checkIn, form.checkOut);
    } catch {
      return 0;
    }
  }, [form.checkIn, form.checkOut]);

  const depositNgn =
    selectedRoom && nights > 0
      ? calculateDepositNgn(selectedRoom.priceFrom, nights)
      : 0;

  const pollTerminalStatus = useCallback(
    async (reference: string) => {
      const res = await fetch(
        `/api/demo/payments/${encodeURIComponent(reference)}/status?key=${encodeURIComponent(dashboardKey)}`,
      );
      if (!res.ok) return null;
      const body = (await res.json()) as { status?: string };
      return body.status ?? null;
    },
    [dashboardKey],
  );

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !waitingPayment) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, waitingPayment]);

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setSubmitError(null);
    setWaitingPayment(null);
    setPaymentStatus(null);
    const checkIn = seed?.checkIn && isValidYmd(seed.checkIn) ? seed.checkIn : today;
    const checkOut =
      seed?.checkOut && isValidYmd(seed.checkOut)
        ? seed.checkOut
        : defaultCheckOut(checkIn);
    const defaultRoom = seed?.roomId ?? roomOptions[0]?.id ?? "";
    setForm(
      initialForm(defaultRoom, checkIn, {
        checkOut,
        status: seed?.status ?? "confirmed",
        paymentMethod:
          seed?.paymentMethod ??
          (seed?.status === "pending" ? "none" : "cash"),
      }),
    );
    // Intentionally re-seed only when the dialog opens or calendar seed changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed?.roomId, seed?.checkIn, seed?.checkOut, seed?.status, seed?.paymentMethod, today]);

  useEffect(() => {
    if (!waitingPayment) return;

    let cancelled = false;
    const tick = async () => {
      const status = await pollTerminalStatus(waitingPayment.reference);
      if (cancelled || !status) return;

      if (status === "success") {
        setPaymentStatus("success");
        celebrateSuccess();
        onCreated();
        window.setTimeout(() => {
          if (!cancelled) {
            setWaitingPayment(null);
            onClose();
            setForm(initialForm(roomOptions[0]?.id ?? "", today));
          }
        }, 1200);
      } else if (status === "failed") {
        setPaymentStatus("failed");
      }
    };

    void tick();
    const id = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [waitingPayment, pollTerminalStatus, onCreated, onClose, roomOptions, today]);

  async function handleManualConfirm() {
    if (!waitingPayment) return;
    const confirmed = window.confirm(t("createReservation.manualConfirmPrompt"));
    if (!confirmed) return;

    setConfirmingManually(true);
    setConfirmError(null);
    try {
      const res = await fetch(
        `/api/demo/payments/${encodeURIComponent(waitingPayment.reference)}/confirm?key=${encodeURIComponent(dashboardKey)}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setConfirmError(body?.error ?? t("createReservation.manualConfirmError"));
        setConfirmingManually(false);
        return;
      }
      setPaymentStatus("success");
      celebrateSuccess();
      onCreated();
      window.setTimeout(() => {
        setWaitingPayment(null);
        setConfirmingManually(false);
        onClose();
        setForm(initialForm(roomOptions[0]?.id ?? "", today));
      }, 1200);
    } catch {
      setConfirmError(t("createReservation.manualConfirmError"));
      setConfirmingManually(false);
    }
  }

  if (!open) return null;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "checkIn" && typeof value === "string") {
        // Only bump check-out when it would become invalid; keep staff's chosen length when possible.
        try {
          const nextIn = parseYmd(value);
          const currentOut = isValidYmd(prev.checkOut)
            ? parseYmd(prev.checkOut)
            : null;
          if (!currentOut || currentOut <= nextIn) {
            next.checkOut = defaultCheckOut(value);
          }
        } catch {
          next.checkOut = defaultCheckOut(value);
        }
      }
      if (key === "paymentMethod") {
        const method = value as StaffPaymentOption;
        if (method === "none") {
          next.status = "pending";
        } else if (
          method === "moniepoint_terminal" ||
          method === "paystack_terminal" ||
          method === "bank_transfer_manual"
        ) {
          next.status = "pending";
        } else {
          next.status = "confirmed";
        }
      }
      if (key === "status" && value === "pending") {
        next.paymentMethod = "none";
      }
      return next;
    });
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};

    if (!form.firstName.trim()) errors.firstName = t("createReservation.errors.required");
    if (!form.lastName.trim()) errors.lastName = t("createReservation.errors.required");
    if (!form.email.trim()) {
      errors.email = t("createReservation.errors.required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = t("createReservation.errors.email");
    }
    if (!form.roomId) errors.roomId = t("createReservation.errors.required");
    if (!isValidYmd(form.checkIn)) errors.checkIn = t("dateInvalid");
    if (!isValidYmd(form.checkOut)) errors.checkOut = t("dateInvalid");
    if (
      isValidYmd(form.checkIn) &&
      isValidYmd(form.checkOut) &&
      parseYmd(form.checkOut) <= parseYmd(form.checkIn)
    ) {
      errors.checkOut = t("dateRangeInvalid");
    }

    const guests = Number(form.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
      errors.guests = t("createReservation.errors.guests");
    }

    if (
      form.paymentMethod !== "none" &&
      form.paymentMethod !== "moniepoint_terminal" &&
      form.paymentMethod !== "paystack_terminal" &&
      form.paymentMethod !== "bank_transfer_manual" &&
      form.status !== "confirmed"
    ) {
      errors.status = t("createReservation.errors.depositNeedsConfirmed");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(
        `/api/demo/reservations?key=${encodeURIComponent(dashboardKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined,
            roomId: form.roomId,
            checkIn: form.checkIn,
            checkOut: form.checkOut,
            guests: Number(form.guests),
            message: form.message.trim() || undefined,
            status: form.status,
            paymentMethod: form.paymentMethod,
            depositAmountNgn: collectsDeposit ? depositNgn : undefined,
          }),
        },
      );

      const body = (await res.json().catch(() => null)) as {
        error?: string;
        paymentPending?: boolean;
        paymentReference?: string;
        paymentMethod?: StaffPaymentOption;
      } | null;

      if (!res.ok) {
        setSubmitError(body?.error ?? t("createReservation.errors.submit"));
        return;
      }

      if (
        body?.paymentPending &&
        body.paymentReference &&
        (body.paymentMethod === "moniepoint_terminal" ||
          body.paymentMethod === "moniepoint_transfer" ||
          body.paymentMethod === "paystack_terminal" ||
          body.paymentMethod === "bank_transfer_manual")
      ) {
        setWaitingPayment({
          reference: body.paymentReference,
          method: body.paymentMethod,
        });
        setPaymentStatus("pending");
        return;
      }

      celebrateSuccess();
      onCreated();
      onClose();
      setForm(initialForm(roomOptions[0]?.id ?? "", today));
    } catch {
      setSubmitError(t("createReservation.errors.submit"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in sm:items-center sm:p-4"
      role="presentation"
      onClick={() => {
        if (!waitingPayment) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-create-reservation-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col border-border bg-card shadow-xl sm:rounded-xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {t("createReservation.eyebrow")}
            </p>
            <h2 id="staff-create-reservation-title" className="text-lg font-semibold">
              {waitingPayment
                ? waitingPayment.method === "moniepoint_transfer"
                  ? t("createReservation.transferWaitingTitle")
                  : waitingPayment.method === "bank_transfer_manual"
                    ? t("createReservation.bankTransferWaitingTitle")
                    : t("createReservation.terminalWaitingTitle")
                : t("createReservation.title")}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {waitingPayment
                ? waitingPayment.method === "moniepoint_transfer"
                  ? t("createReservation.transferWaitingSubtitle")
                  : waitingPayment.method === "bank_transfer_manual"
                    ? t("createReservation.bankTransferWaitingSubtitle")
                    : t("createReservation.terminalWaitingSubtitle")
                : seed
                  ? t("createReservation.subtitleFromCalendar")
                  : t("createReservation.subtitle")}
            </p>
          </div>
          {!waitingPayment ? (
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-border hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              aria-label={t("calendar.closeDetail")}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
        </div>

        {waitingPayment ? (
          <div className="space-y-4 px-4 py-6">
            <p className="font-mono text-sm">{waitingPayment.reference}</p>
            {waitingPayment.method === "moniepoint_transfer" &&
            moniepointConfig?.transferAccount ? (
              <div className="rounded-lg border border-border bg-muted/5 px-3 py-3 text-sm">
                <p className="font-medium">
                  {t("createReservation.transferAccountTitle")}
                </p>
                <p className="mt-1">{moniepointConfig.transferAccount.bankName}</p>
                <p className="font-mono">
                  {moniepointConfig.transferAccount.accountNumber}
                </p>
                <p>{moniepointConfig.transferAccount.accountName}</p>
                <p className="mt-2 text-xs text-muted">
                  {t("createReservation.transferNarrationHint")}
                </p>
              </div>
            ) : null}
            {waitingPayment.method === "bank_transfer_manual" &&
            bankTransferConfig?.account ? (
              <div className="rounded-lg border border-border bg-muted/5 px-3 py-3 text-sm">
                <p className="font-medium">
                  {t("createReservation.bankTransferAccountTitle")}
                </p>
                <p className="mt-1">{bankTransferConfig.account.bankName}</p>
                <p className="font-mono">
                  {bankTransferConfig.account.accountNumber}
                </p>
                <p>{bankTransferConfig.account.accountName}</p>
                <p className="mt-2 text-xs text-muted">
                  {t("createReservation.bankTransferManualHint")}
                </p>
              </div>
            ) : null}
            {waitingPayment.method === "moniepoint_transfer" &&
            paymentStatus === "pending" ? (
              <div
                className={cn(
                  "flex items-center justify-center rounded-lg border px-3 py-2 font-mono text-lg tabular-nums tracking-wider",
                  transferExpired
                    ? "border-amber-400/60 text-amber-700 dark:text-amber-300"
                    : "border-border",
                )}
                aria-live="polite"
              >
                {formatCountdown(transferSecondsRemaining)}
              </div>
            ) : null}
            <div className="flex items-center gap-3 text-sm">
              {paymentStatus === "pending" && !transferExpired ? (
                <Loader2 className="h-5 w-5 animate-spin text-teal" aria-hidden />
              ) : null}
              <p>
                {paymentStatus === "success"
                  ? t("createReservation.terminalSuccess")
                  : paymentStatus === "failed"
                    ? t("createReservation.terminalFailed")
                    : transferExpired
                      ? t("createReservation.transferExpired")
                      : waitingPayment.method === "moniepoint_transfer"
                        ? t("createReservation.transferPending")
                        : waitingPayment.method === "bank_transfer_manual"
                          ? t("createReservation.bankTransferPending")
                          : t("createReservation.terminalPending")}
              </p>
            </div>
            {!transferExpired ? (
              <p className="text-xs text-muted">
                {waitingPayment.method === "moniepoint_transfer"
                  ? t("createReservation.transferHint")
                  : waitingPayment.method === "bank_transfer_manual"
                    ? t("createReservation.bankTransferHint")
                    : t("createReservation.terminalHint")}
              </p>
            ) : null}
            {paymentStatus === "pending" ? (
              <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                <p className="text-xs text-muted">
                  {t("createReservation.manualConfirmHint")}
                </p>
                <button
                  type="button"
                  onClick={handleManualConfirm}
                  disabled={confirmingManually}
                  className="rounded-lg border border-teal px-4 py-2 text-sm font-medium text-teal-dark hover:bg-teal/10 disabled:opacity-60"
                >
                  {confirmingManually
                    ? t("createReservation.manualConfirming")
                    : t("createReservation.manualConfirmButton")}
                </button>
                {confirmError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {confirmError}
                  </p>
                ) : null}
              </div>
            ) : null}
            {paymentStatus === "failed" || transferExpired ? (
              <button
                type="button"
                onClick={() => {
                  setWaitingPayment(null);
                  setPaymentStatus(null);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-teal"
              >
                {t("createReservation.backToForm")}
              </button>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("createReservation.firstName")} error={fieldErrors.firstName}>
                  <input
                    className={inputClassName}
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    autoComplete="given-name"
                  />
                </Field>
                <Field label={t("createReservation.lastName")} error={fieldErrors.lastName}>
                  <input
                    className={inputClassName}
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    autoComplete="family-name"
                  />
                </Field>
              </div>

              <Field label={t("createReservation.email")} error={fieldErrors.email}>
                <input
                  type="email"
                  className={inputClassName}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  autoComplete="email"
                />
              </Field>

              <Field label={t("createReservation.phone")} error={fieldErrors.phone}>
                <input
                  type="tel"
                  className={inputClassName}
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  autoComplete="tel"
                  placeholder="+234..."
                />
              </Field>

              <Field label={t("createReservation.room")} error={fieldErrors.roomId}>
                <select
                  className={inputClassName}
                  value={form.roomId}
                  onChange={(e) => updateField("roomId", e.target.value)}
                >
                  {roomOptions.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("createReservation.checkIn")} error={fieldErrors.checkIn}>
                  <input
                    type="date"
                    className={inputClassName}
                    value={form.checkIn}
                    onChange={(e) => updateField("checkIn", e.target.value)}
                  />
                </Field>
                <Field label={t("createReservation.checkOut")} error={fieldErrors.checkOut}>
                  <input
                    type="date"
                    className={inputClassName}
                    value={form.checkOut}
                    min={
                      isValidYmd(form.checkIn)
                        ? formatYmd(addDays(parseYmd(form.checkIn), 1))
                        : undefined
                    }
                    onChange={(e) => updateField("checkOut", e.target.value)}
                  />
                </Field>
              </div>
              <p className="text-xs text-muted">
                {t("createReservation.stayDatesHint")}
                {nights > 0
                  ? ` ${t("createReservation.nightsCount", { count: nights })}`
                  : null}
              </p>

              <Field label={t("createReservation.guests")} error={fieldErrors.guests}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputClassName}
                  value={form.guests}
                  onChange={(e) => updateField("guests", e.target.value)}
                />
              </Field>

              {nights > 0 && selectedRoom && collectsDeposit ? (
                <p className="rounded-lg bg-muted/10 px-3 py-2 text-sm text-muted">
                  {t("createReservation.staySummary", {
                    nights,
                    deposit: formatNaira(depositNgn),
                  })}
                </p>
              ) : null}

              <Field label={t("createReservation.notes")}>
                <textarea
                  className={cn(inputClassName, "min-h-[80px] py-2")}
                  value={form.message}
                  onChange={(e) => updateField("message", e.target.value)}
                  placeholder={t("createReservation.notesPlaceholder")}
                />
              </Field>

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-muted">
                  {t("createReservation.paymentMethod")}
                </legend>
                <div className="space-y-2">
                  {UI_PAYMENT_GROUPS.map((group) => {
                    const method: StaffPaymentOption =
                      group === "card"
                        ? cardMethod
                        : group === "transfer"
                          ? "moniepoint_transfer"
                          : group === "bankTransferManual"
                            ? "bank_transfer_manual"
                            : group;
                    return (
                      <label
                        key={group}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
                          uiGroupForMethod(form.paymentMethod) === group
                            ? "border-teal bg-teal/5"
                            : "border-border",
                        )}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          className="mt-1"
                          checked={uiGroupForMethod(form.paymentMethod) === group}
                          onChange={() => updateField("paymentMethod", method)}
                        />
                        <span className="text-sm">
                          <span className="font-medium">
                            {t(`createReservation.paymentMethods.${group}`)}
                          </span>
                          <span className="mt-0.5 block text-muted">
                            {t(`createReservation.paymentMethods.${group}Hint`)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {form.paymentMethod === "moniepoint_transfer" ? (
                <>
                  {moniepointConfig?.transferAccount ? (
                    <div className="rounded-lg border border-border bg-muted/5 px-3 py-3 text-sm">
                      <p className="font-medium">
                        {t("createReservation.transferAccountTitle")}
                      </p>
                      <p className="mt-1">{moniepointConfig.transferAccount.bankName}</p>
                      <p className="font-mono">
                        {moniepointConfig.transferAccount.accountNumber}
                      </p>
                      <p>{moniepointConfig.transferAccount.accountName}</p>
                      <p className="mt-2 text-xs text-muted">
                        {t("createReservation.transferAutoDetectHint")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-amber-200">
                      {t("createReservation.transferAccountMissing")}
                    </p>
                  )}
                </>
              ) : null}

              {form.paymentMethod === "bank_transfer_manual" ? (
                <>
                  {bankTransferConfig?.account ? (
                    <div className="rounded-lg border border-border bg-muted/5 px-3 py-3 text-sm">
                      <p className="font-medium">
                        {t("createReservation.bankTransferAccountTitle")}
                      </p>
                      <p className="mt-1">{bankTransferConfig.account.bankName}</p>
                      <p className="font-mono">
                        {bankTransferConfig.account.accountNumber}
                      </p>
                      <p>{bankTransferConfig.account.accountName}</p>
                      <p className="mt-2 text-xs text-muted">
                        {t("createReservation.bankTransferManualHint")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-amber-200">
                      {t("createReservation.bankTransferAccountMissing")}
                    </p>
                  )}
                </>
              ) : null}

              {form.paymentMethod === "moniepoint_terminal" &&
              moniepointConfig &&
              !moniepointConfig.terminalConfigured &&
              !moniepointConfig.demoMode ? (
                <p className="text-xs text-amber-700 dark:text-amber-200">
                  {t("createReservation.terminalNotConfigured")}
                </p>
              ) : null}

              {form.paymentMethod === "paystack_terminal" &&
              paystackTerminalConfig?.demoMode ? (
                <p className="text-xs text-amber-700 dark:text-amber-200">
                  {t("createReservation.paystackTerminalNotConfigured")}
                </p>
              ) : null}

              {form.paymentMethod === "none" ? (
                <Field label={t("createReservation.status")} error={fieldErrors.status}>
                  <select
                    className={inputClassName}
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value as FormState["status"])
                    }
                  >
                    <option value="confirmed">{t("filters.confirmed")}</option>
                    <option value="pending">{t("filters.pending")}</option>
                  </select>
                </Field>
              ) : null}

              {submitError ? (
                <p className="text-sm text-red-600" role="alert">
                  {submitError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border px-4 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-teal"
              >
                {t("createReservation.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-gray-950 disabled:opacity-60 sm:flex-none"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden />
                )}
                {t("createReservation.submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
