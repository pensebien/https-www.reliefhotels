import type { BookQueryParams, StayContext } from "../types";
import type { ReservationFormValues } from "./reservation-schema";

export function calculateDepositNgn(
  itemType: "room" | "tour",
  priceFrom: number,
  nights: number,
  guests: number,
): number {
  if (itemType === "room") {
    return Math.round(priceFrom * nights * 0.2);
  }
  return priceFrom * guests;
}

export function calculateTotalEstimateNgn(
  itemType: "room" | "tour",
  priceFrom: number,
  nights: number,
  guests: number,
): number {
  if (itemType === "room") {
    return priceFrom * nights;
  }
  return priceFrom * guests;
}

export function buildReservationPayload(
  formData: ReservationFormValues,
  stayContext: StayContext,
) {
  const summaryParts = [
    `${stayContext.itemType}:${stayContext.itemId}`,
    stayContext.itemLabel,
  ];

  if (stayContext.checkIn && stayContext.checkOut) {
    summaryParts.push(`${stayContext.checkIn} → ${stayContext.checkOut}`);
  }

  summaryParts.push(
    `${stayContext.nights} night(s)`,
    `${stayContext.guests} guest(s)`,
  );

  let message = formData.message.trim();
  if (formData.phone?.trim()) {
    const phoneLine = `Phone: ${formData.phone.trim()}`;
    message = message ? `${phoneLine}\n\n${message}` : phoneLine;
  }

  return {
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    email: formData.email.trim(),
    phone: formData.phone?.trim() || undefined,
    itemType: stayContext.itemType,
    roomId: stayContext.itemId,
    checkIn: stayContext.checkIn,
    checkOut: stayContext.checkOut,
    nights: stayContext.nights,
    guests: stayContext.guests,
    stayPreference: summaryParts.join(" · "),
    message: message || "No special requests",
  };
}

export function buildBookQueryString(params: BookQueryParams): string {
  const sp = new URLSearchParams();

  if (params.type) sp.set("type", params.type);
  if (params.id) sp.set("id", params.id);
  if (params.room) sp.set("room", params.room);
  if (params.tour) sp.set("tour", params.tour);
  if (params.checkIn) sp.set("checkIn", params.checkIn);
  if (params.checkOut) sp.set("checkOut", params.checkOut);
  if (params.nights !== undefined) sp.set("nights", String(params.nights));
  if (params.guests !== undefined) sp.set("guests", String(params.guests));

  return sp.toString();
}
