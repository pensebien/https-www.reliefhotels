import { calculateDepositNgn } from "@/lib/booking-deposit";
import { rooms } from "@/content/site";
import type { CashierReservation } from "@/features/cashier/types";

export function parseCashierYmd(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export function formatCashierDate(ymd?: string): string {
  if (!ymd) return "—";
  const date = parseCashierYmd(ymd);
  if (!date) return ymd;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function computeNights(reservation: CashierReservation): number | null {
  if (reservation.nights && reservation.nights > 0) return reservation.nights;
  if (!reservation.checkIn || !reservation.checkOut) return null;
  const inDate = parseCashierYmd(reservation.checkIn);
  const outDate = parseCashierYmd(reservation.checkOut);
  if (!inDate || !outDate) return null;
  const diff = Math.round((outDate.getTime() - inDate.getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
}

const roomsById = new Map<string, (typeof rooms)[number]>(
  rooms.map((room) => [room.id, room]),
);

/**
 * Suggested front-desk collect amount = 20% deposit (same as online Paystack),
 * aligned with the primary KPI path (paid bookings). Cashier may override.
 */
export function suggestedDepositNgn(reservation: CashierReservation): number | null {
  if (!reservation.roomId) return null;
  const room = roomsById.get(reservation.roomId);
  if (!room) return null;
  const nights = computeNights(reservation) ?? 1;
  return calculateDepositNgn(room.priceFrom, nights);
}

export function guestFullName(reservation: CashierReservation): string {
  const name = `${reservation.firstName ?? ""} ${reservation.lastName ?? ""}`.trim();
  return name || reservation.email;
}

/** A reservation still needs cashier attention if pending, or if it has no successful payment yet. */
export function isUnsettledReservation(
  reservation: CashierReservation,
  hasSuccessfulPayment: boolean,
): boolean {
  if (reservation.status === "cancelled") return false;
  return reservation.status === "pending" || !hasSuccessfulPayment;
}
