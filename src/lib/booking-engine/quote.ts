/**
 * Server-side stay quote — the single source of truth for what a guest pays.
 * Clients may display a quote, but reservation and payment routes recompute
 * it from stored dates, never from client-sent nights or amounts.
 */

import {
  addDaysToDateString,
  nightsBetween,
  parseDateString,
} from "@/lib/booking-search";
import type {
  Coupon,
  Extra,
  RateConfig,
  RoomRatePolicy,
  SeasonalRate,
} from "./rate-config";

export type QuoteInput = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms?: number;
  couponCode?: string;
  extraIds?: string[];
  /** Non-cancelled reservations already using couponCode (for maxRedemptions). */
  couponRedemptions?: number;
  /**
   * Staff override: price the stay but skip stay rules (capacity, min/max
   * stay, closed to arrival). Never exposed to guests; never skips availability.
   */
  ignoreRestrictions?: boolean;
};

/** Codes a staff member may deliberately override for a walk-in. */
export const OVERRIDABLE_RULE_CODES: readonly QuoteErrorCode[] = [
  "over_capacity",
  "min_stay",
  "max_stay",
  "closed_to_arrival",
];

export type NightLine = { date: string; nightlyNgn: number; seasonId?: string };

export type ExtraLine = { id: string; label: string; totalNgn: number };

export type QuoteErrorCode =
  | "unknown_room"
  | "invalid_dates"
  | "over_capacity"
  | "min_stay"
  | "max_stay"
  | "closed_to_arrival"
  | "invalid_coupon"
  | "unknown_extra";

export type StayQuote = {
  ok: true;
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  guests: number;
  perNight: NightLine[];
  roomSubtotalNgn: number;
  longStayDiscountNgn: number;
  couponDiscountNgn: number;
  couponCode?: string;
  extras: ExtraLine[];
  extrasTotalNgn: number;
  totalNgn: number;
  depositNgn: number;
  depositPct: number;
};

export type QuoteError = { ok: false; code: QuoteErrorCode; message: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fail(code: QuoteErrorCode, message: string): QuoteError {
  return { ok: false, code, message };
}

function seasonAppliesTo(season: SeasonalRate, roomId: string, date: string) {
  if (season.roomIds && !season.roomIds.includes(roomId)) return false;
  return date >= season.from && date < season.to;
}

/** Later seasons in the list win, so owners can layer a short event over a long season. */
function seasonFor(config: RateConfig, roomId: string, date: string) {
  let match: SeasonalRate | undefined;
  for (const season of config.seasons) {
    if (seasonAppliesTo(season, roomId, date)) match = season;
  }
  return match;
}

function nightlyRate(
  policy: RoomRatePolicy,
  season: SeasonalRate | undefined,
  date: string,
): number {
  const day = parseDateString(date).getDay();
  const weekend = day === 5 || day === 6;
  let rate = season?.nightlyNgn ?? policy.baseNightlyNgn;
  if (weekend) rate += policy.weekendUpliftNgn;
  if (season?.adjustPct) rate = rate * (1 + season.adjustPct / 100);
  return Math.round(rate);
}

function findCoupon(config: RateConfig, code: string | undefined) {
  if (!code) return undefined;
  const wanted = code.trim().toUpperCase();
  return config.coupons.find((c) => c.code.toUpperCase() === wanted);
}

function couponValid(
  coupon: Coupon,
  roomId: string,
  checkIn: string,
  nights: number,
  redemptions: number,
): boolean {
  if (coupon.active === false) return false;
  if (coupon.maxRedemptions && redemptions >= coupon.maxRedemptions) return false;
  if (coupon.roomIds && !coupon.roomIds.includes(roomId)) return false;
  if (coupon.validFrom && checkIn < coupon.validFrom) return false;
  if (coupon.validTo && checkIn >= coupon.validTo) return false;
  if (coupon.minNights && nights < coupon.minNights) return false;
  return true;
}

function extraTotal(extra: Extra, nights: number, guests: number): number {
  switch (extra.pricing) {
    case "per_stay":
      return extra.priceNgn;
    case "per_night":
      return extra.priceNgn * nights;
    case "per_guest_night":
      return extra.priceNgn * nights * guests;
  }
}

export function quoteStay(
  input: QuoteInput,
  config: RateConfig,
): StayQuote | QuoteError {
  const units = input.rooms ?? 1;
  const policy = config.rooms.find((r) => r.roomId === input.roomId);
  if (!policy) return fail("unknown_room", "Room not found");

  if (
    !DATE_RE.test(input.checkIn) ||
    !DATE_RE.test(input.checkOut) ||
    input.checkOut <= input.checkIn
  ) {
    return fail("invalid_dates", "Check-out must be after check-in");
  }

  const enforce = !input.ignoreRestrictions;

  if (enforce && input.guests > policy.maxGuestsPerUnit * units) {
    return fail(
      "over_capacity",
      `This room sleeps up to ${policy.maxGuestsPerUnit} guests per room`,
    );
  }

  const nights = nightsBetween(input.checkIn, input.checkOut);
  const coupon = findCoupon(config, input.couponCode);
  if (input.couponCode && (!coupon || !couponValid(coupon, policy.roomId, input.checkIn, nights, input.couponRedemptions ?? 0))) {
    return fail("invalid_coupon", "This promo code is not valid for your stay");
  }

  const arrivalSeason = seasonFor(config, policy.roomId, input.checkIn);
  if (enforce && arrivalSeason?.closedToArrival) {
    return fail("closed_to_arrival", `Arrivals are closed on ${input.checkIn}`);
  }

  const minNights = Math.max(policy.minNights, arrivalSeason?.minNights ?? 1);
  if (enforce && nights < minNights && !coupon?.bypassMinStay) {
    return fail("min_stay", `Minimum stay for these dates is ${minNights} nights`);
  }
  if (enforce && nights > policy.maxNights) {
    return fail("max_stay", `Maximum stay is ${policy.maxNights} nights`);
  }

  const perNight: NightLine[] = [];
  for (let i = 0; i < nights; i++) {
    const date = addDaysToDateString(input.checkIn, i);
    const season = seasonFor(config, policy.roomId, date);
    perNight.push({
      date,
      nightlyNgn: nightlyRate(policy, season, date),
      seasonId: season?.id,
    });
  }

  const roomSubtotalNgn =
    perNight.reduce((sum, n) => sum + n.nightlyNgn, 0) * units;

  const longStayPct = config.longStay
    .filter((d) => nights >= d.minNights)
    .reduce((best, d) => Math.max(best, d.pct), 0);
  const longStayDiscountNgn = Math.round((roomSubtotalNgn * longStayPct) / 100);

  const afterLongStay = roomSubtotalNgn - longStayDiscountNgn;
  const couponDiscountNgn = coupon
    ? Math.min(
        afterLongStay,
        Math.round(
          coupon.amountNgn ?? (afterLongStay * (coupon.pct ?? 0)) / 100,
        ),
      )
    : 0;

  const extras: ExtraLine[] = [];
  for (const id of new Set(input.extraIds ?? [])) {
    const extra = config.extras.find((e) => e.id === id);
    if (
      !extra ||
      extra.active === false ||
      (extra.roomIds && !extra.roomIds.includes(policy.roomId))
    ) {
      return fail("unknown_extra", "One of the selected extras is unavailable");
    }
    extras.push({
      id: extra.id,
      label: extra.label,
      totalNgn: extraTotal(extra, nights, input.guests),
    });
  }
  const extrasTotalNgn = extras.reduce((sum, e) => sum + e.totalNgn, 0);

  const totalNgn = afterLongStay - couponDiscountNgn + extrasTotalNgn;

  return {
    ok: true,
    roomId: policy.roomId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    rooms: units,
    guests: input.guests,
    perNight,
    roomSubtotalNgn,
    longStayDiscountNgn,
    couponDiscountNgn,
    couponCode: coupon?.code,
    extras,
    extrasTotalNgn,
    totalNgn,
    depositNgn: Math.round((totalNgn * config.depositPct) / 100),
    depositPct: config.depositPct,
  };
}
