/** Pure helpers for scheduled guest messages: who is due today, and the rendered text. */

import type { ReservationRecord } from "@/lib/demo-store";
import type { MessageTemplate } from "./settings";

export const PLACEHOLDERS = [
  "firstName",
  "lastName",
  "checkIn",
  "checkOut",
  "nights",
  "roomType",
  "roomNumbers",
  "manageLink",
  "reviewLink",
  "hotelName",
  "hotelPhone",
] as const;

export type Placeholder = (typeof PLACEHOLDERS)[number];
export type MessageValues = Record<Placeholder, string>;

/** Replaces {name} tokens; unknown tokens stay as typed so mistakes are visible in previews. */
export function renderTemplate(text: string, values: MessageValues): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    (PLACEHOLDERS as readonly string[]).includes(name) ? values[name as Placeholder] : match,
  );
}

function shift(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The base date (check-in / check-out / booking day) a template fires for, given today. */
export function targetBaseDate(template: MessageTemplate, today: string): string {
  return shift(today, template.timing === "before" ? template.days : -template.days);
}

function baseDateOf(r: ReservationRecord, template: MessageTemplate): string | undefined {
  if (template.base === "check_in") return r.checkIn;
  if (template.base === "check_out") return r.checkOut;
  return r.createdAt.slice(0, 10);
}

/**
 * Bookings this template should go to today: room bookings that are
 * confirmed (or checked out, for after-stay messages), one per group (the
 * lead), on the matching base date, with a way to reach the guest.
 */
export function dueReservations(
  template: MessageTemplate,
  reservations: ReservationRecord[],
  today: string,
): ReservationRecord[] {
  const target = targetBaseDate(template, today);
  const allowed = template.base === "check_out" && template.timing === "after"
    ? new Set(["confirmed", "checked_out"])
    : new Set(["confirmed"]);
  return reservations.filter(
    (r) =>
      r.itemType === "room" &&
      allowed.has(r.status) &&
      (!r.groupId || r.groupId === r.id) &&
      baseDateOf(r, template) === target &&
      (template.channel === "email" ? Boolean(r.email) : Boolean(r.phone)),
  );
}

/** Today's date in Calabar (WAT, UTC+1), which decides "2 days before check-in". */
export function lagosToday(now = Date.now()): string {
  return new Date(now + 3_600_000).toISOString().slice(0, 10);
}
