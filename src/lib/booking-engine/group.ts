/**
 * Group bookings: several room types on the same dates in one checkout and
 * one payment. Each room type becomes its own reservation (so availability,
 * room assignment and the calendar stay per type), linked by `groupId`; the
 * first line is the lead that carries extras, payments and the manage link.
 */

import { quoteStay, type QuoteError, type StayQuote } from "./quote";
import type { RateConfig } from "./rate-config";

export type GroupStayLine = { roomId: string; rooms: number };

export type GroupQuoteInput = {
  checkIn: string;
  checkOut: string;
  /** Total guests across all rooms; spread over the lines by capacity. */
  guests: number;
  stays: GroupStayLine[];
  couponCode?: string;
  /** Extras belong to the booking, so they go on the lead line. */
  extraIds?: string[];
  couponRedemptions?: number;
  ignoreRestrictions?: boolean;
};

export type GroupQuote = {
  ok: true;
  lines: StayQuote[];
  totalNgn: number;
  depositNgn: number;
  nights: number;
};

/**
 * Seat guests room type by room type, filling each to capacity in order, at
 * least one guest per line. Returns null when the party doesn't fit.
 */
export function allocateGuests(
  stays: GroupStayLine[],
  totalGuests: number,
  config: RateConfig,
): number[] | null {
  const capacity = stays.map((s) => {
    const policy = config.rooms.find((r) => r.roomId === s.roomId);
    return (policy?.maxGuestsPerUnit ?? 1) * s.rooms;
  });
  if (totalGuests < stays.length || totalGuests > capacity.reduce((a, b) => a + b, 0)) return null;
  const seats = stays.map(() => 1);
  let left = totalGuests - stays.length;
  for (let i = 0; i < stays.length && left > 0; i++) {
    const add = Math.min(left, capacity[i] - 1);
    seats[i] += add;
    left -= add;
  }
  return seats;
}

export function quoteGroup(input: GroupQuoteInput, config: RateConfig): GroupQuote | QuoteError {
  const stays = input.stays.filter((s) => s.rooms > 0);
  if (stays.length === 0) {
    return { ok: false, code: "unknown_room", message: "Choose at least one room" };
  }
  if (new Set(stays.map((s) => s.roomId)).size !== stays.length) {
    return { ok: false, code: "unknown_room", message: "List each room type once" };
  }
  const seats = input.ignoreRestrictions
    ? stays.map((s, i) => (i === 0 ? Math.max(1, input.guests - (stays.length - 1)) : 1))
    : allocateGuests(stays, input.guests, config);
  if (!seats) {
    return {
      ok: false,
      code: "over_capacity",
      message: "These rooms don't sleep that many guests — add a room or reduce guests",
    };
  }

  const lines: StayQuote[] = [];
  for (let i = 0; i < stays.length; i++) {
    const quote = quoteStay(
      {
        roomId: stays[i].roomId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guests: seats[i],
        rooms: stays[i].rooms,
        couponCode: input.couponCode,
        couponRedemptions: input.couponRedemptions,
        extraIds: i === 0 ? input.extraIds : undefined,
        ignoreRestrictions: input.ignoreRestrictions,
      },
      config,
    );
    if (!quote.ok) return quote;
    lines.push(quote);
  }

  return {
    ok: true,
    lines,
    totalNgn: lines.reduce((sum, q) => sum + q.totalNgn, 0),
    depositNgn: lines.reduce((sum, q) => sum + q.depositNgn, 0),
    nights: lines[0].nights,
  };
}
