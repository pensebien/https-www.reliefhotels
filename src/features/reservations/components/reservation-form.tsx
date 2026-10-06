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
    extras = [],
    addableRooms = [],
    ratePlans = [],
    bookingMode = "instant",
    arrivalTimeField = "optional",
    customFields = [],
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
    units,
    updateUnits,
    maxGuests,
    extraIds,
    toggleExtra,
    couponInput,
    setCouponInput,
    couponCode,
    couponError,
    applyCoupon,
    removeCoupon,
    quote,
    groupQuote,
    ratePlanId,
    setRatePlanId,
    additional,
    setAdditionalRooms,
    quoteError,
    quoteLoading,
    confirmedWithoutPayment,
  } = useReservationFlow(props);
  const roomLabels = Object.fromEntries([
    [props.itemId, itemLabel],
    ...addableRooms.map((r) => [r.id, r.label] as const),
  ]);
  const canContinue = !quoteError && !quoteLoading;

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
    if (!canContinue) return;
    if (validateStep1()) {
      setStep(2);
    }
  }

  if (status === "success" && confirmedWithoutPayment) {
    return (
      <div className="rounded-2xl border-2 border-teal/30 bg-teal/5 p-6 sm:p-8" role="status">
        <h3 className="font-serif text-2xl font-semibold">{t("confirmedNoPaymentTitle")}</h3>
        <p className="mt-2 text-muted">{t("confirmedNoPaymentBody", { email: formData.email })}</p>
      </div>
    );
  }

  if (status === "success" && bookingMode === "request") {
    return (
      <div className="rounded-2xl border-2 border-teal/30 bg-teal/5 p-6 sm:p-8" role="status">
        <h3 className="font-serif text-2xl font-semibold">{t("requestSentTitle")}</h3>
        <p className="mt-2 text-muted">{t("requestSentBody", { email: formData.email })}</p>
      </div>
    );
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
          rooms={units}
          maxGuests={maxGuests}
          onRoomsChange={updateUnits}
          quote={quote}
          groupQuote={groupQuote}
          roomLabels={roomLabels}
          quoteError={quoteError?.message}
          footnote={step === 2 ? t("managerNotifyAfterPayment") : undefined}
        />
      </div>

      {step === 1 ? (
        <div className="mt-6 space-y-5">
          {ratePlans.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className={labelClassName}>{t("rateTitle")}</legend>
              {[{ id: "", label: t("rateStandard"), description: t("rateStandardHint"), adjustPct: 0, refundable: true }, ...ratePlans].map((plan) => {
                const checked = (ratePlanId ?? "") === plan.id;
                return (
                  <label
                    key={plan.id || "standard"}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3",
                      checked ? "border-teal bg-teal/10" : "border-border hover:border-teal/50",
                    )}
                  >
                    <input
                      type="radio"
                      name="ratePlan"
                      checked={checked}
                      onChange={() => setRatePlanId(plan.id || undefined)}
                      className="mt-1 accent-teal"
                    />
                    <span className="text-sm leading-snug">
                      <span className="block font-medium">
                        {plan.label}
                        {plan.adjustPct ? (
                          <span className="ml-2 text-teal-dark">
                            {plan.adjustPct < 0 ? t("rateOff", { pct: -plan.adjustPct }) : t("rateMore", { pct: plan.adjustPct })}
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-muted">
                        {plan.description || (plan.refundable ? t("rateStandardHint") : t("rateNonRefundable"))}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ) : null}

          {addableRooms.length > 0 ? (
            <fieldset className="space-y-3">
              <legend className={labelClassName}>{t("addRoomsTitle")}</legend>
              <p className="text-xs leading-5 text-muted">{t("addRoomsHint")}</p>
              <ul className="space-y-2">
                {addableRooms.map((room) => {
                  const count = additional[room.id] ?? 0;
                  const max = Math.min(4, room.availableUnits);
                  return (
                    <li
                      key={room.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3",
                        count > 0 ? "border-teal bg-teal/10" : "border-border",
                      )}
                    >
                      <span className="text-sm leading-snug">
                        <span className="block font-medium">{room.label}</span>
                        <span className="block text-muted">
                          {t("addRoomsFrom", { price: formatNaira(room.priceFrom), left: room.availableUnits })}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-xl border border-border bg-background p-1">
                        <button
                          type="button"
                          aria-label={t("addRoomsLess", { room: room.label })}
                          disabled={count <= 0}
                          onClick={() => setAdditionalRooms(room.id, count - 1)}
                          className="h-8 w-8 rounded-lg hover:bg-muted/40 disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-medium tabular-nums" aria-live="polite">
                          {count}
                        </span>
                        <button
                          type="button"
                          aria-label={t("addRoomsMore", { room: room.label })}
                          disabled={count >= max}
                          onClick={() => setAdditionalRooms(room.id, count + 1)}
                          className="h-8 w-8 rounded-lg hover:bg-muted/40 disabled:opacity-40"
                        >
                          +
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ) : null}

          {extras.length > 0 ? (
            <fieldset className="space-y-3">
              <legend className={labelClassName}>{t("extrasTitle")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {extras.map((extra) => {
                  const checked = extra.included || extraIds.includes(extra.id);
                  return (
                    <label
                      key={extra.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                        checked ? "border-teal bg-teal/10" : "border-border hover:border-teal/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={extra.included}
                        onChange={() => toggleExtra(extra.id)}
                        className="mt-0.5 h-4 w-4 rounded border-border accent-teal"
                      />
                      <span className="text-sm leading-snug">
                        <span className="block font-medium">
                          {extra.label}
                          {extra.included ? <span className="ml-2 text-xs text-muted">{t("extraIncluded")}</span> : null}
                        </span>
                        <span className="block text-muted">
                          {formatNaira(extra.priceNgn)} {t(`extraPricing.${extra.pricing}`)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="res-coupon" className={labelClassName}>
              {t("promoCode")}
            </label>
            {couponCode ? (
              <p className="flex items-center gap-3 text-sm">
                <span className="rounded-full bg-teal/10 px-3 py-1 font-medium text-teal-dark">
                  {couponCode}
                </span>
                <button type="button" onClick={removeCoupon} className="text-muted underline">
                  {t("removePromo")}
                </button>
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  id="res-coupon"
                  type="text"
                  autoComplete="off"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoupon();
                    }
                  }}
                  className={cn(inputClassName, "uppercase")}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={!couponInput.trim()}
                  className="shrink-0 rounded-xl border border-border px-5 text-sm font-medium hover:border-teal disabled:opacity-50"
                >
                  {t("applyPromo")}
                </button>
              </div>
            )}
            {couponError ? <p className="text-xs text-red-600">{couponError}</p> : null}
          </div>
        </div>
      ) : null}

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

            {arrivalTimeField !== "hidden" ? (
              <div className="space-y-2">
                <label htmlFor="res-arrival" className={labelClassName}>
                  {arrivalTimeField === "required" ? t("arrivalTime") : t("arrivalTimeOptional")}
                </label>
                <input
                  id="res-arrival"
                  type="time"
                  required={arrivalTimeField === "required"}
                  value={formData.arrivalTime}
                  onChange={(e) => updateField("arrivalTime", e.target.value)}
                  className={inputClassName}
                />
              </div>
            ) : null}

            {customFields.map((field) =>
              field.type === "checkbox" ? (
                <label key={field.id} className="flex items-start gap-3 text-sm sm:col-span-2">
                  <input
                    id={`res-cf-${field.id}`}
                    type="checkbox"
                    required={field.required}
                    checked={formData.customAnswers[field.id] === true}
                    onChange={(e) => updateField("customAnswers", { ...formData.customAnswers, [field.id]: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-teal"
                  />
                  <span>{field.label}</span>
                </label>
              ) : (
                <div key={field.id} className="space-y-2 sm:col-span-2">
                  <label htmlFor={`res-cf-${field.id}`} className={labelClassName}>
                    {field.required ? field.label : t("optionalField", { label: field.label })}
                  </label>
                  <input
                    id={`res-cf-${field.id}`}
                    type="text"
                    required={field.required}
                    value={String(formData.customAnswers[field.id] ?? "")}
                    onChange={(e) => updateField("customAnswers", { ...formData.customAnswers, [field.id]: e.target.value })}
                    className={inputClassName}
                  />
                </div>
              ),
            )}

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
              disabled={!canContinue}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal px-6 py-3.5 text-sm font-medium text-gray-950 transition-colors hover:bg-teal-dark disabled:opacity-60"
            >
              {t("continueToPayment")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
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
              {status === "loading" ? t("submitting") : bookingMode === "request" ? t("sendRequest") : t("payDeposit")}
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
