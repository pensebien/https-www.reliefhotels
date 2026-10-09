/**
 * Unpaid online bookings hold their room for a short while but are only sent
 * to RAYZA once paid, so RAYZA's free count doesn't know about them yet.
 * Whatever the website offers is RAYZA's free count minus these holds.
 */

import { holdsInventory, listReservationsForReport, type ReservationRecord } from "@/lib/demo-store";

/**
 * Is this a pending online booking still holding a room RAYZA doesn't know
 * about? Only holds with an expiry count: every online booking gets one, and
 * older pending bookings without it (retired desk / request-mode flows) must
 * not block rooms forever.
 */
export function isUnpaidHold(r: ReservationRecord, now = Date.now()): boolean {
  return r.itemType === "room" && r.status === "pending" && Boolean(r.holdExpiresAt) && holdsInventory(r, now);
}

/** Units held by unpaid bookings overlapping [checkIn, checkOut), per room type. */
export async function unpaidHoldsByRoom(checkIn: string, checkOut: string): Promise<Record<string, number>> {
  const now = Date.now();
  const held: Record<string, number> = {};
  for (const r of await listReservationsForReport(checkIn, checkOut)) {
    if (!r.roomId || !r.checkIn || !r.checkOut || !isUnpaidHold(r, now)) continue;
    if (r.checkIn >= checkOut || r.checkOut <= checkIn) continue;
    held[r.roomId] = (held[r.roomId] ?? 0) + (r.units ?? 1);
  }
  return held;
}
