import type { EngineOptions } from "./rate-config";

/** Calabar (WAT, UTC+1) date and "HH:MM" for `now`. */
function lagosNow(now: number): { date: string; time: string } {
  const iso = new Date(now + 3_600_000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/**
 * Whether guests may book an arrival on `checkIn` right now (online only —
 * the front desk isn't limited). Returns a guest-facing reason, or null.
 */
export function bookingWindowError(checkIn: string, engine: EngineOptions, now = Date.now()): string | null {
  const { date: today, time } = lagosNow(now);
  const daysAhead = Math.round((Date.parse(`${checkIn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (daysAhead < 0) return "Check-in can't be in the past";
  if (daysAhead < engine.minDaysAhead) {
    return `Online bookings need at least ${engine.minDaysAhead} day(s) notice. Please contact the hotel.`;
  }
  if (engine.maxDaysAhead !== null && daysAhead > engine.maxDaysAhead) {
    return `Online bookings open ${engine.maxDaysAhead} days ahead. Please choose earlier dates or contact the hotel.`;
  }
  if (daysAhead === 0 && engine.sameDayCutoff && time >= engine.sameDayCutoff) {
    return `Same-day online bookings close at ${engine.sameDayCutoff}. Please call the hotel to book tonight.`;
  }
  return null;
}
