"use client";

import {
  parseDateString,
  toDateString,
} from "@/lib/booking-search";
import type { QuoteErrorCode, StayQuote } from "@/lib/booking-engine/quote";
import { useCallback, useEffect, useMemo, useState } from "react";
import { reservationFormSchema } from "../lib/reservation-schema";
import {
  buildReservationPayload,
  calculateDepositNgn,
} from "../lib/reservation-service";
import type {
  ReservationFlowProps,
  ReservationFlowStatus,
  ReservationFormData,
  StayContext,
} from "../types";

const defaultFormData: ReservationFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
  experienceInterests: [],
  arrivalTime: "",
  termsAccepted: false,
};

const MIN_NIGHTS = 1;
const MAX_NIGHTS = 30;
const MIN_GUESTS = 1;
const MAX_GUESTS = 12;
const MAX_ROOMS = 4;
const QUOTE_DEBOUNCE_MS = 250;

function addDaysYmd(ymd: string, days: number): string {
  const date = parseDateString(ymd);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function useReservationFlow(options: ReservationFlowProps) {
  const {
    itemId,
    itemLabel,
    checkIn: initialCheckIn,
    checkOut: initialCheckOut,
    nights: initialNights,
    guests: initialGuests,
    priceFrom,
    rooms: initialRooms = 1,
    maxGuestsPerUnit = MAX_GUESTS,
    useDemoTestAmount = false,
  } = options;

  const [formData, setFormData] = useState<ReservationFormData>(defaultFormData);
  const [nights, setNights] = useState(initialNights);
  const [guests, setGuests] = useState(initialGuests);
  const [units, setUnits] = useState(initialRooms);
  const [quote, setQuote] = useState<StayQuote | null>(null);
  const [quoteError, setQuoteError] = useState<{ code: QuoteErrorCode; message: string } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [checkOut, setCheckOut] = useState(
    initialCheckOut ??
      (initialCheckIn ? addDaysYmd(initialCheckIn, initialNights) : undefined),
  );
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof ReservationFormData, string>>
  >({});
  const [status, setStatus] = useState<ReservationFlowStatus>("idle");
  /** Confirmed with nothing to pay now (a 0% deposit). */
  const [confirmedWithoutPayment, setConfirmedWithoutPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkIn = initialCheckIn;

  const stayContext = useMemo<StayContext>(
    () => ({
      itemType: "room",
      itemId,
      itemLabel,
      checkIn,
      checkOut,
      nights,
      guests,
      rooms: units,
      priceFrom,
    }),
    [checkIn, checkOut, guests, itemId, itemLabel, nights, priceFrom, units],
  );

  // Live server quote from RAYZA — the same price the reservation route
  // locks in, so what the guest sees is what they are charged.
  useEffect(() => {
    if (!checkIn || !checkOut) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const res = await fetch("/api/booking/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            roomId: itemId,
            checkIn,
            checkOut,
            guests,
            rooms: units,
          }),
        });
        const body = await res.json();
        if (res.ok) {
          setQuote(body as StayQuote);
          setQuoteError(null);
        } else {
          setQuote(null);
          setQuoteError({ code: body.code, message: body.error ?? "Unable to price this stay" });
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") setQuote(null);
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false);
      }
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [checkIn, checkOut, guests, itemId, units]);

  const depositNgn = useMemo(
    () => quote?.depositNgn ?? calculateDepositNgn(priceFrom, nights) * units,
    [nights, priceFrom, quote, units],
  );

  const maxGuests = Math.min(MAX_GUESTS, maxGuestsPerUnit * units);

  const updateUnits = useCallback((next: number) => {
    setUnits(Math.min(MAX_ROOMS, Math.max(1, next)));
  }, []);

  const updateNights = useCallback(
    (next: number) => {
      const clamped = Math.min(MAX_NIGHTS, Math.max(MIN_NIGHTS, next));
      setNights(clamped);
      if (checkIn) {
        setCheckOut(addDaysYmd(checkIn, clamped));
      }
    },
    [checkIn],
  );

  const updateGuests = useCallback((next: number) => {
    setGuests(Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, next)));
  }, []);

  const updateField = useCallback(
    <K extends keyof ReservationFormData>(
      field: K,
      value: ReservationFormData[K],
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setValidationErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const toggleExperienceInterest = useCallback((id: string) => {
    setFormData((prev) => {
      const selected = prev.experienceInterests.includes(id);
      return {
        ...prev,
        experienceInterests: selected
          ? prev.experienceInterests.filter((x) => x !== id)
          : [...prev.experienceInterests, id],
      };
    });
  }, []);

  const submitReservation = useCallback(async (): Promise<{ id: string; noPaymentNeeded: boolean } | null> => {
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
      return null;
    }

    setValidationErrors({});
    setStatus("loading");
    setErrorMessage(null);

    try {
      const payload = buildReservationPayload(parsed.data, stayContext);
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { id?: string; error?: string; noPaymentNeeded?: boolean };

      if (!res.ok || !data.id) {
        throw new Error(data.error ?? "Unable to create reservation");
      }

      return { id: data.id, noPaymentNeeded: data.noPaymentNeeded === true };
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create reservation",
      );
      return null;
    }
  }, [formData, stayContext]);

  const initiatePayment = useCallback(
    async (reservationId: string): Promise<void> => {
      try {
        const res = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim(),
            itemType: "room",
            itemId,
            reservationId,
            ...(useDemoTestAmount ? { demoAmountNgn: 5000 } : {}),
          }),
        });

        const data = (await res.json()) as {
          authorizationUrl?: string;
          error?: string;
        };

        if (!res.ok || !data.authorizationUrl) {
          throw new Error(data.error ?? "Payment initialization failed");
        }

        window.location.href = data.authorizationUrl;
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Payment initialization failed",
        );
      }
    },
    [formData.email, itemId, useDemoTestAmount],
  );

  const handleReserveAndPay = useCallback(async () => {
    const created = await submitReservation();
    if (!created) return;
    // A 0% deposit is confirmed straight away: nothing to pay now.
    if (created.noPaymentNeeded) {
      setConfirmedWithoutPayment(true);
      setStatus("success");
      return;
    }
    await initiatePayment(created.id);
  }, [initiatePayment, submitReservation]);

  return {
    formData,
    updateField,
    toggleExperienceInterest,
    validationErrors,
    setValidationErrors,
    status,
    errorMessage,
    depositNgn,
    stayContext,
    nights,
    guests,
    checkIn,
    checkOut,
    updateNights,
    updateGuests,
    units,
    updateUnits,
    maxGuests,
    quote,
    quoteError,
    quoteLoading,
    submitReservation,
    initiatePayment,
    handleReserveAndPay,
    confirmedWithoutPayment,
  };
}
