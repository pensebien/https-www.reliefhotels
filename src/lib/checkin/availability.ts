import type { ReservationRecord } from "@/lib/demo-store";
import { lagosToday } from "@/lib/guest-messages/render";
import type { CheckinSettings } from "./settings";

export type CheckinState = "disabled" | "not_open" | "open" | "done" | "closed";

function shift(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Whether the guest can check in online now: confirmed (deposit paid),
 * from `opensDaysBefore` days before arrival until check-out day.
 */
export function checkinState(
  members: ReservationRecord[],
  settings: CheckinSettings,
  alreadyDone: boolean,
  now = Date.now(),
): { state: CheckinState; opensOn?: string } {
  const lead = members[0];
  if (!settings.enabled || !lead?.checkIn || !lead.checkOut) return { state: "disabled" };
  if (alreadyDone) return { state: "done" };
  const today = lagosToday(now);
  const opensOn = shift(lead.checkIn, -settings.opensDaysBefore);
  if (lead.status !== "confirmed" || today >= lead.checkOut) return { state: "closed", opensOn };
  if (today < opensOn) return { state: "not_open", opensOn };
  return { state: "open", opensOn };
}
