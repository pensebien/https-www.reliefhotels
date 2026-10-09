/**
 * Server-side stay quote — the single source of truth for what a guest pays.
 * The price is RAYZA's tax-inclusive nightly rate for the dates; clients may
 * display a quote, but reservation and payment routes recompute it, never
 * trusting client-sent nights or amounts.
 */

import { nightsBetween } from "@/lib/booking-search";
import { rayzaOffers, type RayzaRoomCheck } from "@/lib/integrations/rayza-sync";
import { getBookingSettings } from "./booking-settings";
import { unpaidHoldsByRoom } from "./holds";

export type QuoteInput = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms?: number;
};

export type QuoteErrorCode =
  | "unknown_room"
  | "invalid_dates"
  | "over_capacity"
  | "closed"
  | "sold_out"
  | "rayza_unavailable";

export type StayQuote = {
  ok: true;
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  guests: number;
  nightlyNgn: number;
  totalNgn: number;
  depositNgn: number;
  depositPct: number;
  /** Rooms RAYZA still has free for these dates (before this booking). */
  free: number;
};

export type QuoteError = { ok: false; code: QuoteErrorCode; message: string };

export const RAYZA_UNAVAILABLE_MESSAGE =
  "Live availability is temporarily unavailable. Please call or WhatsApp us to book.";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fail(code: QuoteErrorCode, message: string): QuoteError {
  return { ok: false, code, message };
}

/** Pure: price one room-type line from RAYZA's offer for the dates. */
export function quoteStay(
  input: QuoteInput,
  offer: RayzaRoomCheck | undefined,
  depositPct: number,
): StayQuote | QuoteError {
  const units = input.rooms ?? 1;
  if (!DATE_RE.test(input.checkIn) || !DATE_RE.test(input.checkOut) || input.checkOut <= input.checkIn) {
    return fail("invalid_dates", "Check-out must be after check-in");
  }
  if (!offer) return fail("unknown_room", "This room can't be booked online. Please contact the hotel.");
  if (offer.reason) return fail("closed", offer.reason);
  if (offer.free < units) {
    return fail("sold_out", "This room is not available for the selected dates. Please choose different dates.");
  }
  if (Math.ceil(input.guests / units) > offer.maxOccupancy) {
    return fail("over_capacity", `This room sleeps up to ${offer.maxOccupancy} guests per room`);
  }
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const totalNgn = Math.round(offer.nightlyNgn * nights * units);
  return {
    ok: true,
    roomId: input.roomId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    rooms: units,
    guests: input.guests,
    nightlyNgn: offer.nightlyNgn,
    totalNgn,
    depositNgn: Math.round((totalNgn * depositPct) / 100),
    depositPct,
    free: offer.free,
  };
}

/**
 * Quote against RAYZA now, less the rooms other guests are holding while they
 * pay. `fresh` bypasses the short catalogue cache.
 */
export async function quoteStayLive(input: QuoteInput, fresh = false): Promise<StayQuote | QuoteError> {
  if (!DATE_RE.test(input.checkIn) || !DATE_RE.test(input.checkOut) || input.checkOut <= input.checkIn) {
    return fail("invalid_dates", "Check-out must be after check-in");
  }
  const [offers, holds] = await Promise.all([
    rayzaOffers(input.checkIn, input.checkOut, nightsBetween(input.checkIn, input.checkOut), fresh),
    unpaidHoldsByRoom(input.checkIn, input.checkOut),
  ]);
  if (!offers.ok) return fail("rayza_unavailable", RAYZA_UNAVAILABLE_MESSAGE);
  const offer = offers.checks[input.roomId];
  const free = offer ? { ...offer, free: Math.max(0, offer.free - (holds[input.roomId] ?? 0)) } : undefined;
  return quoteStay(input, free, getBookingSettings().depositPct);
}
