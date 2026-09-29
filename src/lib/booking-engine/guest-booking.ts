/**
 * What a guest may see and do from their manage-booking link: amounts paid
 * and due, and whether cancelling is allowed and what it refunds. Pure, so
 * the policy is unit-tested apart from the routes that enforce it.
 */

import { rooms } from "@/content/site";
import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";
import type { CancellationPolicy } from "./rate-config";

/** Hotel check-in is 14:00 in Calabar (WAT, UTC+1) → 13:00 UTC. */
const CHECK_IN_UTC_HOUR = 13;

export function checkInInstant(checkIn: string): Date {
  return new Date(`${checkIn}T${String(CHECK_IN_UTC_HOUR).padStart(2, "0")}:00:00Z`);
}

export type GuestBookingView = {
  id: string;
  firstName: string;
  lastName: string;
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  guests: number;
  rooms: number;
  status: ReservationRecord["status"];
  couponCode?: string;
  extraIds?: string[];
  totalNgn: number;
  depositNgn: number;
  paidNgn: number;
  /** What the guest can pay online right now (deposit if nothing paid yet, else balance). */
  amountDueNgn: number;
  amountDueKind: "deposit" | "balance" | null;
  holdExpiresAt?: string;
  canCancel: boolean;
  /** Last instant a cancellation still gets the in-window refund. */
  freeCancelUntil?: string;
  refundIfCancelledNgn: number;
};

function fallbackTotal(reservation: ReservationRecord): number {
  const room = rooms.find((r) => r.id === reservation.roomId);
  return (room?.priceFrom ?? 0) * (reservation.nights ?? 1) * (reservation.units ?? 1);
}

export function buildGuestBookingView(
  reservation: ReservationRecord,
  payments: PaymentRecord[],
  policy: CancellationPolicy,
  depositPct: number,
  now = new Date(),
): GuestBookingView {
  const totalNgn = reservation.quotedTotalNgn ?? fallbackTotal(reservation);
  const depositNgn =
    reservation.quotedDepositNgn ?? Math.round((totalNgn * depositPct) / 100);
  const paidNgn = Math.round(
    payments
      .filter((p) => p.status === "success")
      .reduce((sum, p) => sum + p.amountKobo, 0) / 100,
  );

  const active = reservation.status === "pending" || reservation.status === "confirmed";
  const beforeCheckIn = reservation.checkIn
    ? now < checkInInstant(reservation.checkIn)
    : false;
  const beforeCheckOut = reservation.checkOut
    ? now < checkInInstant(reservation.checkOut)
    : false;
  const holdLapsed =
    reservation.status === "pending" &&
    Boolean(reservation.holdExpiresAt) &&
    new Date(reservation.holdExpiresAt!) <= now;

  let amountDueNgn = 0;
  let amountDueKind: GuestBookingView["amountDueKind"] = null;
  if (active && beforeCheckOut) {
    if (paidNgn === 0 && !holdLapsed) {
      amountDueNgn = depositNgn;
      amountDueKind = "deposit";
    } else if (paidNgn > 0 && totalNgn > paidNgn) {
      amountDueNgn = totalNgn - paidNgn;
      amountDueKind = "balance";
    }
  }

  const freeCancelUntil = reservation.checkIn
    ? new Date(
        checkInInstant(reservation.checkIn).getTime() -
          policy.freeCancelHoursBefore * 3_600_000,
      )
    : undefined;
  const withinWindow = freeCancelUntil ? now <= freeCancelUntil : false;
  const canCancel = policy.allowGuestCancel && active && beforeCheckIn;

  return {
    id: reservation.id,
    firstName: reservation.firstName,
    lastName: reservation.lastName,
    roomId: reservation.roomId,
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    nights: reservation.nights,
    guests: reservation.guests,
    rooms: reservation.units ?? 1,
    status: reservation.status,
    couponCode: reservation.couponCode,
    extraIds: reservation.extraIds,
    totalNgn,
    depositNgn,
    paidNgn,
    amountDueNgn,
    amountDueKind,
    holdExpiresAt: reservation.holdExpiresAt,
    canCancel,
    freeCancelUntil: freeCancelUntil?.toISOString(),
    refundIfCancelledNgn:
      canCancel && withinWindow
        ? Math.round((paidNgn * policy.refundPctWithinWindow) / 100)
        : 0,
  };
}
