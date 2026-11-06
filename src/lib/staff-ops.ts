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
import {
  amountDueNgn,
  bookingRef,
  quickReplies,
  sendPaymentConfirmedWhatsapp,
  transferAccount,
} from "@/lib/whatsapp-transfer";

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
  /** Short reference the guest quotes in the transfer description. */
  ref: string;
  paymentMode?: ReservationRecord["paymentMode"];
  /** Digits with country code; null if the guest never gave one. */
  whatsappNumber: string | null;
  /** Amount a pay-by-transfer guest was told to send. */
  amountDueNgn: number;
  confirmedBy?: string;
  confirmedAt?: string;
  moniepointRef?: string;
  /** One-tap WhatsApp replies for the desk (message text; the board builds the wa.me link). */
  replies: { id: string; text: string }[];
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

  const account = transferAccount();
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
      ref: bookingRef(r.id),
      paymentMode: r.paymentMode,
      whatsappNumber: r.whatsappNumber ?? null,
      amountDueNgn: amountDueNgn(r),
      confirmedBy: r.paymentConfirmedBy,
      confirmedAt: r.paymentConfirmedAt,
      moniepointRef: r.moniepointPaymentRef,
      replies: r.whatsappNumber ? quickReplies(r, account) : [],
    };
  });
}

export type OpsActionResult = { ok: true; message: string } | { ok: false; status: number; error: string };

/**
 * The guest paid by bank transfer straight to the hotel's Moniepoint account
 * (not through the website checkout). Staff saw the credit on the POS and
 * attest it: the booking is confirmed and handed to RAYZA exactly as an online
 * payment would be, who confirmed it and when is recorded on the booking, and
 * a first confirmation sends the guest a WhatsApp receipt.
 *
 * `moniepointRef` is the optional reference from the POS alert; it can confirm
 * only one booking, which also makes a double-tap harmless.
 */
export async function recordTransferReceived(
  reservationId: string,
  amountNgn: number,
  staffName: string | null,
  moniepointRef?: string,
): Promise<OpsActionResult> {
  const reservation = await findReservationById(reservationId);
  if (!reservation || reservation.itemType !== "room") return { ok: false, status: 404, error: "Booking not found" };
  if (reservation.status === "cancelled") return { ok: false, status: 409, error: "This booking is cancelled" };

  const ref = moniepointRef?.trim() || undefined;
  if (ref) {
    const { reservations, payments } = await getActivity();
    const used =
      reservations.some((r) => r.moniepointPaymentRef === ref) ||
      payments.some((p) => p.externalReference?.includes(`MP:${ref}`));
    if (used) return { ok: false, status: 409, error: "That Moniepoint reference has already been used" };
  }

  const firstConfirmation = reservation.status !== "confirmed";
  const confirmedAt = new Date().toISOString();
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
    externalReference: ["STAFF-ATTESTED", staffName, ref ? `MP:${ref}` : null].filter(Boolean).join(":"),
  });
  const confirmed =
    (await updateReservationById(reservationId, {
      status: "confirmed",
      paymentReference: reservation.paymentReference ?? payment.reference,
      holdExpiresAt: undefined,
      paymentConfirmedBy: staffName ?? "staff",
      paymentConfirmedAt: confirmedAt,
      ...(ref ? { moniepointPaymentRef: ref } : {}),
    })) ?? { ...reservation, status: "confirmed" as const };
  await handlePaymentConfirmed(payment, confirmed);
  const whatsapp = firstConfirmation ? await sendPaymentConfirmedWhatsapp(confirmed) : false;
  return {
    ok: true,
    message: `Recorded ₦${amountNgn.toLocaleString("en-NG")} and confirmed the booking${
      firstConfirmation && confirmed.whatsappNumber ? (whatsapp ? " — guest notified on WhatsApp" : " — send the WhatsApp receipt below") : ""
    }`,
  };
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
