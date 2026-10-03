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
  AvailabilityRestriction,
  Coupon,
  Extra,
  RateConfig,
  RoomRatePolicy,
  SeasonalRate,
  StayRule,
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
  /** Alternative rate the guest chose (rate plan id); omit for the standard rate. */
  ratePlanId?: string;
};

/** Codes a staff member may deliberately override for a walk-in. */
export const OVERRIDABLE_RULE_CODES: readonly QuoteErrorCode[] = [
  "over_capacity",
  "min_stay",
  "max_stay",
  "closed_to_arrival",
  "closed_to_departure",
  "closed",
  "stay_length",
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
  | "closed_to_departure"
  | "closed"
  | "stay_length"
  | "invalid_coupon"
  | "invalid_rate_plan"
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
  /** The rate plan priced, if not the standard rate. */
  ratePlan?: { id: string; label: string; refundable: boolean };
};

export type QuoteError = { ok: false; code: QuoteErrorCode; message: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fail(code: QuoteErrorCode, message: string): QuoteError {
  return { ok: false, code, message };
}

function weekdayOf(date: string): number {
  return parseDateString(date).getDay();
}

function seasonAppliesTo(season: SeasonalRate, roomId: string, date: string) {
  if (season.roomIds && !season.roomIds.includes(roomId)) return false;
  if (season.weekdays?.length && !season.weekdays.includes(weekdayOf(date))) return false;
  return date >= season.from && date < season.to;
}

function restrictionHits(r: AvailabilityRestriction, roomId: string, date: string): boolean {
  if (r.roomIds && !r.roomIds.includes(roomId)) return false;
  if (r.weekdays?.length && !r.weekdays.includes(weekdayOf(date))) return false;
  return date >= r.from && date < r.to;
}

/** Stay-length rules for an arrival date; the strictest minimum and maximum win. */
function stayRulesFor(config: RateConfig, roomId: string, checkIn: string): StayRule[] {
  return config.stayRules.filter(
    (rule) =>
      (!rule.roomIds || rule.roomIds.includes(roomId)) &&
      (!rule.from || checkIn >= rule.from) &&
      (!rule.to || checkIn < rule.to) &&
      (!rule.checkInWeekdays?.length || rule.checkInWeekdays.includes(weekdayOf(checkIn))),
  );
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

function extraTotal(extra: Extra, nights: number, guests: number, rooms: number): number {
  switch (extra.pricing) {
    case "per_stay":
      return extra.priceNgn;
    case "per_night":
      return extra.priceNgn * nights;
    case "per_guest_night":
      return extra.priceNgn * nights * guests;
    case "per_room":
      return extra.priceNgn * rooms;
    case "per_room_night":
      return extra.priceNgn * nights * rooms;
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

  const plan = input.ratePlanId
    ? config.ratePlans.find((p) => p.id === input.ratePlanId)
    : undefined;
  if (
    input.ratePlanId &&
    (!plan || plan.active === false || (plan.roomIds && !plan.roomIds.includes(policy.roomId)))
  ) {
    return fail("invalid_rate_plan", "That rate isn't available for this room");
  }

  const arrivalSeason = seasonFor(config, policy.roomId, input.checkIn);
  if (enforce && arrivalSeason?.closedToArrival) {
    return fail("closed_to_arrival", `Arrivals are closed on ${input.checkIn}`);
  }

  if (enforce) {
    const stayDates = Array.from({ length: nights }, (_, i) => addDaysToDateString(input.checkIn, i));
    for (const r of config.restrictions) {
      if (r.mode === "no_arrival" && restrictionHits(r, policy.roomId, input.checkIn)) {
        return fail("closed_to_arrival", `Arrivals aren't possible on ${input.checkIn} (${r.label})`);
      }
      if (r.mode === "no_departure" && restrictionHits(r, policy.roomId, input.checkOut)) {
        return fail("closed_to_departure", `Departures aren't possible on ${input.checkOut} (${r.label})`);
      }
      const closedNight = r.mode === "closed" && stayDates.find((d) => restrictionHits(r, policy.roomId, d));
      if (closedNight) {
        return fail("closed", `This room can't be booked on ${closedNight} (${r.label})`);
      }
    }
  }

  const rules = stayRulesFor(config, policy.roomId, input.checkIn);
  const minNights = Math.max(
    policy.minNights,
    arrivalSeason?.minNights ?? 1,
    ...rules.map((r) => r.minNights),
  );
  const maxNights = Math.min(
    policy.maxNights,
    ...rules.map((r) => r.maxNights ?? Number.POSITIVE_INFINITY),
  );
  if (enforce && nights < minNights && !coupon?.bypassMinStay) {
    return fail("min_stay", `Minimum stay for these dates is ${minNights} nights`);
  }
  if (enforce && nights > maxNights) {
    return fail("max_stay", `Maximum stay for these dates is ${maxNights} nights`);
  }
  if (enforce && rules.some((r) => r.wholeWeeks) && nights % 7 !== 0 && !coupon?.bypassMinStay) {
    return fail("stay_length", "Stays starting on this day are booked in whole weeks (7, 14, 21 nights…)");
  }

  const perNight: NightLine[] = [];
  for (let i = 0; i < nights; i++) {
    const date = addDaysToDateString(input.checkIn, i);
    const season = seasonFor(config, policy.roomId, date);
    const base = nightlyRate(policy, season, date);
    perNight.push({
      date,
      nightlyNgn: plan ? Math.round(base * (1 + plan.adjustPct / 100)) : base,
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
  const included = config.extras
    .filter((e) => e.included && e.active !== false && (!e.roomIds || e.roomIds.includes(policy.roomId)))
    .map((e) => e.id);
  for (const id of new Set([...included, ...(input.extraIds ?? [])])) {
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
      totalNgn: extraTotal(extra, nights, input.guests, units),
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
    depositNgn: Math.round((totalNgn * (plan?.depositPct ?? config.depositPct)) / 100),
    depositPct: plan?.depositPct ?? config.depositPct,
    ratePlan: plan ? { id: plan.id, label: plan.label, refundable: plan.refundable } : undefined,
  };
}
