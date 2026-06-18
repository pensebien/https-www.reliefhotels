"use client";

import { useCallback, useMemo, useState } from "react";
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
  termsAccepted: false,
};

export function useReservationFlow(options: ReservationFlowProps) {
  const {
    itemType,
    itemId,
    itemLabel,
    checkIn,
    checkOut,
    nights,
    guests,
    priceFrom,
    useDemoTestAmount = false,
  } = options;

  const [formData, setFormData] = useState<ReservationFormData>(defaultFormData);
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof ReservationFormData, string>>
  >({});
  const [status, setStatus] = useState<ReservationFlowStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stayContext = useMemo<StayContext>(
    () => ({
      itemType,
      itemId,
      itemLabel,
      checkIn,
      checkOut,
      nights,
      guests,
      priceFrom,
    }),
    [checkIn, checkOut, guests, itemId, itemLabel, itemType, nights, priceFrom],
  );

  const depositNgn = useMemo(
    () => calculateDepositNgn(itemType, priceFrom, nights, guests),
    [guests, itemType, nights, priceFrom],
  );

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
            itemType,
            itemId,
            reservationId,
            nights: itemType === "room" ? nights : undefined,
            guests: itemType === "tour" ? guests : undefined,
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
    [
      formData.email,
      guests,
      itemId,
      itemType,
      nights,
      useDemoTestAmount,
    ],
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
    validationErrors,
    setValidationErrors,
    status,
    errorMessage,
    depositNgn,
    stayContext,
    submitReservation,
    initiatePayment,
    handleReserveAndPay,
  };
}
