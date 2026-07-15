"use client";

import { experienceOptions } from "@/content/experience-options";
import { cn, formatNaira } from "@/lib/utils";
import { ArrowLeft, ArrowRight, CreditCard, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";
import { reservationFormSchema } from "../lib/reservation-schema";
import { useReservationFlow } from "../hooks/use-reservation-flow";
import type { ReservationFlowProps, ReservationFormData } from "../types";
import { BookingSummary } from "./booking-summary";

const inputClassName =
  "h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20";

const labelClassName =
  "text-xs font-medium uppercase tracking-wider text-muted";

export function ReservationForm(props: ReservationFlowProps) {
  const {
    itemLabel,
    priceFrom,
    useDemoTestAmount = false,
  } = props;

  const t = useTranslations("booking");
  const tTours = useTranslations("tours");
  const [step, setStep] = useState<1 | 2>(1);
  const {
    formData,
    updateField,
    validationErrors,
    setValidationErrors,
    status,
    errorMessage,
    depositNgn,
    handleReserveAndPay,
    toggleExperienceInterest,
    nights: stayNights,
    guests: stayGuests,
    checkIn: stayCheckIn,
    checkOut: stayCheckOut,
    updateNights,
    updateGuests,
  } = useReservationFlow(props);

  function validateStep1(): boolean {
    const parsed = reservationFormSchema.safeParse(formData);

    if (!parsed.success) {
      const errors: Partial<Record<keyof ReservationFormData, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ReservationFormData;
        if (key && !errors[key]) {
          errors[key] = issue.message;
        }
      }
      setValidationErrors(errors);
      return false;
    }

    setValidationErrors({});
    return true;
  }

  function onContinue(e: FormEvent) {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === 1) {
      onContinue(e);
      return;
    }
    await handleReserveAndPay();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <h3 className="font-serif text-2xl font-semibold">{t("title")}</h3>
      <p className="mt-1 text-muted">{itemLabel}</p>

      <ol className="mt-6 flex gap-2" aria-label="Booking steps">
        <li
          className={cn(
            "flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors",
            step === 1
              ? "border-teal bg-teal/10 text-foreground"
              : "border-border/70 bg-muted/10 text-muted",
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              step === 1
                ? "bg-teal text-gray-950"
                : "bg-border text-muted",
            )}
          >
            1
          </span>
          <span className="font-medium leading-tight">{t("step1Title")}</span>
        </li>
        <li
          className={cn(
            "flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors",
            step === 2
              ? "border-teal bg-teal/10 text-foreground"
              : "border-border/70 bg-muted/10 text-muted",
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              step === 2
                ? "bg-teal text-gray-950"
                : "bg-border text-muted",
            )}
          >
            2
          </span>
          <span className="font-medium leading-tight">{t("step2Title")}</span>
        </li>
      </ol>

      <div className="mt-6">
        <BookingSummary
          itemLabel={itemLabel}
          checkIn={stayCheckIn}
          checkOut={stayCheckOut}
          nights={stayNights}
          guests={stayGuests}
          depositNgn={depositNgn}
          priceFrom={priceFrom}
          emphasizeDeposit={step === 2}
          editableStay={step === 1}
          onNightsChange={updateNights}
          onGuestsChange={updateGuests}
        />
      </div>

      {(errorMessage || status === "error") && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          {errorMessage ?? t("reservationError")}
        </p>
      )}

      {step === 1 ? (
        <>
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
                required
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className={inputClassName}
              />
              {validationErrors.phone ? (
                <p className="text-xs text-red-600">{validationErrors.phone}</p>
              ) : null}
            </div>

            <fieldset className="space-y-3 sm:col-span-2">
              <legend className={labelClassName}>{t("experienceInterests")}</legend>
              <p className="text-xs leading-5 text-muted">{t("experienceInterestsHint")}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {experienceOptions.map((option) => {
                  const checked = formData.experienceInterests.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                        checked
                          ? "border-teal bg-teal/10"
                          : "border-border hover:border-teal/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExperienceInterest(option.id)}
                        className="mt-0.5 h-4 w-4 rounded border-border accent-teal"
                      />
                      <span className="text-sm leading-snug">
                        {tTours(`${option.labelKey}.name`)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

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
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal px-6 py-3.5 text-sm font-medium text-gray-950 transition-colors hover:bg-teal-dark"
            >
              {t("step2Title")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-6 text-sm leading-6 text-muted">
            {t("managerNotifyAfterPayment")}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={status === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3.5 text-sm font-medium transition-colors hover:bg-muted/20 disabled:opacity-60 sm:flex-1"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("step1Title")}
            </button>
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-teal px-6 py-3.5 text-sm font-medium text-gray-950 transition-colors hover:bg-teal-dark disabled:opacity-60 sm:flex-[2]"
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {status === "loading" ? t("submitting") : t("payDeposit")}
            </button>
          </div>

          {useDemoTestAmount ? (
            <p className="mt-2 text-xs text-muted">
              {t("payTest")}: {formatNaira(5000)} — use Paystack test card{" "}
              <code className="rounded bg-border px-1">4084084084084081</code>
            </p>
          ) : null}
        </>
      )}
    </form>
  );
}
