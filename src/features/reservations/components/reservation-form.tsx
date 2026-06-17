"use client";

import { formatNaira } from "@/lib/utils";
import { CreditCard, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent } from "react";
import { useReservationFlow } from "../hooks/use-reservation-flow";
import type { ReservationFlowProps } from "../types";
import { BookingSummary } from "./booking-summary";

const inputClassName =
  "h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20";

const labelClassName =
  "text-xs font-medium uppercase tracking-wider text-muted";

export function ReservationForm(props: ReservationFlowProps) {
  const {
    itemType,
    itemLabel,
    checkIn,
    checkOut,
    nights,
    guests,
    priceFrom,
    useDemoTestAmount = false,
  } = props;

  const t = useTranslations("booking");
  const {
    formData,
    updateField,
    validationErrors,
    status,
    errorMessage,
    depositNgn,
    handleReserveAndPay,
  } = useReservationFlow(props);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await handleReserveAndPay();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <h3 className="font-serif text-2xl font-semibold">{t("title")}</h3>
      <p className="mt-1 text-muted">{itemLabel}</p>

      <div className="mt-6">
        <BookingSummary
          itemType={itemType}
          itemLabel={itemLabel}
          checkIn={checkIn}
          checkOut={checkOut}
          nights={nights}
          guests={guests}
          depositNgn={depositNgn}
          priceFrom={priceFrom}
        />
      </div>

      {(errorMessage || status === "error") && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          {errorMessage ?? t("reservationError")}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="res-firstName" className={labelClassName}>
            {t("firstName")}
          </label>
          <input
            id="res-firstName"
            type="text"
            autoComplete="given-name"
            value={formData.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            className={inputClassName}
          />
          {validationErrors.firstName ? (
            <p className="text-xs text-red-600">{validationErrors.firstName}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="res-lastName" className={labelClassName}>
            {t("lastName")}
          </label>
          <input
            id="res-lastName"
            type="text"
            autoComplete="family-name"
            value={formData.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            className={inputClassName}
          />
          {validationErrors.lastName ? (
            <p className="text-xs text-red-600">{validationErrors.lastName}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="res-email" className={labelClassName}>
            {t("email")}
          </label>
          <input
            id="res-email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            className={inputClassName}
          />
          {validationErrors.email ? (
            <p className="text-xs text-red-600">{validationErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="res-phone" className={labelClassName}>
            {t("phone")}
          </label>
          <input
            id="res-phone"
            type="tel"
            autoComplete="tel"
            placeholder={t("phonePlaceholder")}
            value={formData.phone ?? ""}
            onChange={(e) => updateField("phone", e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="res-message" className={labelClassName}>
            {t("specialRequests")}
          </label>
          <textarea
            id="res-message"
            value={formData.message}
            onChange={(e) => updateField("message", e.target.value)}
            placeholder={t("specialRequests")}
            className="min-h-28 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border/70 bg-background/50 px-4 py-3">
        <input
          id="res-terms"
          type="checkbox"
          checked={formData.termsAccepted}
          onChange={(e) => updateField("termsAccepted", e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border accent-teal"
        />
        <div className="space-y-1">
          <label htmlFor="res-terms" className="text-sm font-medium text-foreground">
            {t("terms")}
          </label>
          <p className="text-xs leading-5 text-muted">{t("termsNote")}</p>
          {validationErrors.termsAccepted ? (
            <p className="text-xs text-red-600">{validationErrors.termsAccepted}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal px-6 py-3.5 text-sm font-medium text-gray-950 transition-colors hover:bg-teal-dark disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          {status === "loading" ? t("submitting") : t("reserveAndPay")}
        </button>

        {useDemoTestAmount ? (
          <p className="mt-2 text-xs text-muted">
            {t("payTest")}: {formatNaira(5000)} — use Paystack test card{" "}
            <code className="rounded bg-border px-1">4084084084084081</code>
          </p>
        ) : null}
      </div>
    </form>
  );
}
