/**
 * The staff ops view: every recent online booking with where its money and
 * its RAYZA copy stand, and the three things staff still do on the website —
 * record a bank transfer the guest made directly, re-send a booking to RAYZA,
 * and cancel. Everything else happens in RAYZA.
 */

import {
  addPayment,
  findReservationById,
  getActivity,
  updateReservationById,
  type PaymentRecord,
  type ReservationRecord,
} from "@/lib/demo-store";
import {
  cancelReservationOnRayza,
  getSyncRows,
  pushReservationToRayza,
  type RayzaSyncRow,
} from "@/lib/integrations/rayza-sync";
import { handlePaymentConfirmed } from "@/lib/payment-confirmed";
import { roomDisplayName } from "@/lib/room-names";
import { frontDeskPaymentReference } from "@/lib/staff-payment";

const BOARD_LIMIT = 200;

export type OpsRow = {
  id: string;
  createdAt: string;
  guest: string;
  email: string;
  phone?: string;
  room: string;
  checkIn?: string;
  checkOut?: string;
  rooms: number;
  guests: number;
  status: ReservationRecord["status"];
  holdExpiresAt?: string;
  totalNgn?: number;
  depositNgn?: number;
  paidNgn: number;
  payments: { reference: string; amountNgn: number; status: PaymentRecord["status"]; method?: string; at: string }[];
  rayza: Pick<RayzaSyncRow, "state" | "wanted" | "refs" | "code" | "error" | "attempts" | "at"> | null;
  /** Paid but RAYZA refused it: someone must rebook or refund. */
  needsAttention: boolean;
  staffNotes?: string;
};

export async function loadOpsBoard(): Promise<OpsRow[]> {
  const { reservations, payments } = await getActivity();
  const live = reservations
    .filter((r) => r.itemType === "room" && r.source !== "demo")
    .slice(0, BOARD_LIMIT);
  const sync = await getSyncRows(live.map((r) => r.id));
  const byReservation = new Map<string, PaymentRecord[]>();
  for (const p of payments) {
    if (!p.reservationId) continue;
    byReservation.set(p.reservationId, [...(byReservation.get(p.reservationId) ?? []), p]);
  }

  return live.map((r) => {
    const own = byReservation.get(r.id) ?? [];
    const paidNgn = Math.round(own.filter((p) => p.status === "success").reduce((sum, p) => sum + p.amountKobo, 0) / 100);
    const row = sync.get(r.id);
    return {
      id: r.id,
      createdAt: r.createdAt,
      guest: `${r.firstName} ${r.lastName}`,
      email: r.email,
      phone: r.phone,
      room: roomDisplayName(r.roomId),
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      rooms: r.units ?? 1,
      guests: r.guests,
      status: r.status,
      holdExpiresAt: r.holdExpiresAt,
      totalNgn: r.quotedTotalNgn,
      depositNgn: r.quotedDepositNgn,
      paidNgn,
      payments: own.map((p) => ({
        reference: p.reference,
        amountNgn: Math.round(p.amountKobo / 100),
        status: p.status,
        method: p.paymentMethod ?? p.paymentChannel,
        at: p.createdAt,
      })),
      rayza: row
        ? { state: row.state, wanted: row.wanted, refs: row.refs, code: row.code, error: row.error, attempts: row.attempts, at: row.at }
        : null,
      needsAttention: r.status === "confirmed" && row?.state === "failed" && row.wanted === "booked" && Boolean(row.code),
      staffNotes: r.staffNotes,
    };
  });
}

export type OpsActionResult = { ok: true; message: string } | { ok: false; status: number; error: string };

/**
 * The guest paid by bank transfer straight to the hotel's account (not through
 * the website checkout). Staff attest it arrived; the booking is confirmed and
 * handed to RAYZA exactly as an online payment would be.
 */
export async function recordTransferReceived(
  reservationId: string,
  amountNgn: number,
  staffName: string | null,
): Promise<OpsActionResult> {
  const reservation = await findReservationById(reservationId);
  if (!reservation || reservation.itemType !== "room") return { ok: false, status: 404, error: "Booking not found" };
  if (reservation.status === "cancelled") return { ok: false, status: 409, error: "This booking is cancelled" };

  const payment = await addPayment({
    reference: frontDeskPaymentReference("moniepoint_transfer"),
    reservationId,
    email: reservation.email,
    amountKobo: Math.round(amountNgn * 100),
    currency: "NGN",
    status: "success",
    itemType: "room",
    itemId: reservation.roomId ?? "room",
    itemLabel: `${roomDisplayName(reservation.roomId)} — bank transfer`,
    paymentMethod: "moniepoint_transfer",
    paymentChannel: "moniepoint",
    externalReference: `STAFF-ATTESTED${staffName ? `:${staffName}` : ""}`,
  });
  const confirmed =
    (await updateReservationById(reservationId, {
      status: "confirmed",
      paymentReference: reservation.paymentReference ?? payment.reference,
      holdExpiresAt: undefined,
    })) ?? { ...reservation, status: "confirmed" as const };
  await handlePaymentConfirmed(payment, confirmed);
  return { ok: true, message: `Recorded ₦${amountNgn.toLocaleString("en-NG")} and confirmed the booking` };
}

export async function retryRayza(reservationId: string): Promise<OpsActionResult> {
  const reservation = await findReservationById(reservationId);
  if (!reservation) return { ok: false, status: 404, error: "Booking not found" };
  const result =
    reservation.status === "cancelled"
      ? await cancelReservationOnRayza(reservation)
      : reservation.status === "confirmed"
        ? await pushReservationToRayza(reservation)
        : null;
  if (!result) return { ok: false, status: 409, error: "Only paid or cancelled bookings are sent to RAYZA" };
  if (!result.ok) return { ok: false, status: 502, error: `RAYZA: ${result.error}` };
  return { ok: true, message: result.skipped ? "Nothing to send for this booking" : "RAYZA is up to date" };
}

export async function cancelBooking(reservationId: string, staffName: string | null): Promise<OpsActionResult> {
  const reservation = await findReservationById(reservationId);
  if (!reservation) return { ok: false, status: 404, error: "Booking not found" };
  if (reservation.status === "cancelled") return { ok: true, message: "Already cancelled" };
  const cancelledAt = new Date().toISOString();
  const updated = await updateReservationById(reservationId, {
    status: "cancelled",
    cancelledAt,
    staffNotes: [`Cancelled by ${staffName ?? "staff"} ${cancelledAt}.`, reservation.staffNotes].filter(Boolean).join("\n"),
  });
  if (!updated) return { ok: false, status: 404, error: "Booking not found" };
  const released = await cancelReservationOnRayza(updated);
  return released.ok
    ? { ok: true, message: "Booking cancelled" }
    : { ok: true, message: `Cancelled here; RAYZA will be retried (${released.error})` };
}
