"use client";

import {
  parseDateString,
  toDateString,
} from "@/lib/booking-search";
import type { GroupQuote } from "@/lib/booking-engine/group";
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
    addableRooms = [],
    useDemoTestAmount = false,
  } = options;

  const [formData, setFormData] = useState<ReservationFormData>(defaultFormData);
  const [nights, setNights] = useState(initialNights);
  const [guests, setGuests] = useState(initialGuests);
  const [units, setUnits] = useState(initialRooms);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState<string | undefined>();
  const [couponError, setCouponError] = useState<string | null>(null);
  const [quote, setQuote] = useState<StayQuote | null>(null);
  const [groupQuote, setGroupQuote] = useState<GroupQuote | null>(null);
  /** Rooms of other types added to this stay, by room id. */
  const [additional, setAdditional] = useState<Record<string, number>>({});
  const additionalStays = useMemo(
    () =>
      Object.entries(additional)
        .filter(([, rooms]) => rooms > 0)
        .map(([roomId, rooms]) => ({ roomId, rooms })),
    [additional],
  );
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
      couponCode,
      extraIds,
      additionalStays,
    }),
    [additionalStays, checkIn, checkOut, couponCode, extraIds, guests, itemId, itemLabel, nights, priceFrom, units],
  );

  // Live server quote — the same engine the reservation and payment routes
  // use, so what the guest sees is what they are charged.
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
            couponCode,
            extraIds,
            stays: additionalStays.length
              ? [{ roomId: itemId, rooms: units }, ...additionalStays]
              : undefined,
          }),
        });
        const body = await res.json();
        if (res.ok) {
          if (Array.isArray(body.lines)) {
            setGroupQuote(body as GroupQuote);
            setQuote((body as GroupQuote).lines[0]);
          } else {
            setGroupQuote(null);
            setQuote(body as StayQuote);
          }
          setQuoteError(null);
        } else if (body.code === "invalid_coupon") {
          setCouponError(body.error);
          setCouponCode(undefined);
        } else {
          setQuote(null);
          setGroupQuote(null);
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
  }, [additionalStays, checkIn, checkOut, couponCode, extraIds, guests, itemId, units]);

  const depositNgn = useMemo(
    () => groupQuote?.depositNgn ?? quote?.depositNgn ?? calculateDepositNgn(priceFrom, nights) * units,
    [groupQuote, nights, priceFrom, quote, units],
  );

  const maxGuests = Math.min(
    MAX_GUESTS,
    maxGuestsPerUnit * units +
      additionalStays.reduce(
        (sum, s) => sum + (addableRooms.find((r) => r.id === s.roomId)?.maxGuestsPerUnit ?? 1) * s.rooms,
        0,
      ),
  );

  const setAdditionalRooms = useCallback((roomId: string, rooms: number) => {
    setAdditional((prev) => ({ ...prev, [roomId]: Math.max(0, Math.min(4, rooms)) }));
  }, []);

  const updateUnits = useCallback((next: number) => {
    setUnits(Math.min(MAX_ROOMS, Math.max(1, next)));
  }, []);

  const toggleExtra = useCallback((id: string) => {
    setExtraIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const applyCoupon = useCallback(() => {
    const code = couponInput.trim().toUpperCase();
    setCouponError(null);
    setCouponCode(code || undefined);
  }, [couponInput]);

  const removeCoupon = useCallback(() => {
    setCouponCode(undefined);
    setCouponInput("");
    setCouponError(null);
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

  const submitReservation = useCallback(async (): Promise<string | null> => {
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
      const data = (await res.json()) as { id?: string; error?: string };

      if (!res.ok || !data.id) {
        throw new Error(data.error ?? "Unable to create reservation");
      }

      return data.id;
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
    const reservationId = await submitReservation();
    if (reservationId) {
      await initiatePayment(reservationId);
    }
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
    additional,
    setAdditionalRooms,
    quoteError,
    quoteLoading,
    submitReservation,
    initiatePayment,
    handleReserveAndPay,
  };
}
