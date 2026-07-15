import type { BookQueryParams, StayContext } from "../types";
import type { ReservationFormValues } from "./reservation-schema";

export function calculateDepositNgn(
  priceFrom: number,
  nights: number,
): number {
  return Math.round(priceFrom * nights * 0.2);
}

export function calculateTotalEstimateNgn(
  priceFrom: number,
  nights: number,
): number {
  return priceFrom * nights;
}

export function buildReservationPayload(
  formData: ReservationFormValues,
  stayContext: StayContext,
) {
  const summaryParts = [
    `room:${stayContext.itemId}`,
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

  if (formData.experienceInterests.length > 0) {
    const interestsLine = `Calabar experiences of interest (informational — concierge will advise, not charged online): ${formData.experienceInterests.join(", ")}`;
    message = message ? `${interestsLine}\n\n${message}` : interestsLine;
  }

  return {
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim(),
    itemType: "room" as const,
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

  if (params.id) sp.set("id", params.id);
  if (params.room) sp.set("room", params.room);
  if (params.checkIn) sp.set("checkIn", params.checkIn);
  if (params.checkOut) sp.set("checkOut", params.checkOut);
  if (params.nights !== undefined) sp.set("nights", String(params.nights));
  if (params.guests !== undefined) sp.set("guests", String(params.guests));

  return sp.toString();
}
