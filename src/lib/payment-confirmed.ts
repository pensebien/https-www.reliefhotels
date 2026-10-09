import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";
import { sendPaymentConfirmationEmail, sendRayzaRejectedEmails } from "@/lib/email";
import { syncConfirmedReservationToRayza } from "@/lib/integrations/rayza-sync";
import { notifyManager } from "@/lib/notifications";

/**
 * The one place every "a payment just became successful" path calls —
 * online Paystack, Moniepoint, or a staff-confirmed transfer — right after
 * the payment flips to "success" and its reservation is marked confirmed.
 * Hands the booking to RAYZA, sends the receipt and alerts the manager.
 * Returns whether the manager alert (SMS/WhatsApp) went out.
 */
export async function handlePaymentConfirmed(payment: PaymentRecord, reservation: ReservationRecord): Promise<boolean> {
  const pushed = await syncConfirmedReservationToRayza(reservation);
  const guestName = `${reservation.firstName} ${reservation.lastName}`;

  // RAYZA answered with a reason (ROOM_UNAVAILABLE, OCCUPANCY_LIMIT_EXCEEDED,
  // INVALID_ROOM_TYPE, …): it won't take this paid booking as sent, so a person
  // has to rebook or refund. No code means RAYZA wasn't reached — the
  // scheduled sync retries that. The failed sync row and a staff note on the
  // booking (written by the push) flag it in the ops view.
  if (!pushed.ok && pushed.code) {
    await sendRayzaRejectedEmails(reservation, pushed.error);
    await notifyManager({
      event: "booking.needs_attention",
      referenceId: reservation.id,
      guestName,
      phone: reservation.phone,
      summary: `${pushed.error} (${reservation.roomId ?? "room"}, ${reservation.checkIn ?? "?"})`,
    });
  }

  await sendPaymentConfirmationEmail({
    email: payment.email,
    reference: payment.reference,
    amountKobo: payment.amountKobo,
    itemLabel: payment.itemLabel,
  });

  const amountNgn = Math.round(payment.amountKobo / 100);
  const notifyResult = await notifyManager({
    event: "payment.verified",
    referenceId: payment.reference,
    email: payment.email,
    guestName,
    phone: reservation.phone,
    summary: `₦${amountNgn.toLocaleString("en-NG")} deposit — ${payment.itemLabel}`,
  });

  return notifyResult.sent;
}
