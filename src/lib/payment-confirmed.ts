import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";
import { sendPaymentConfirmationEmail } from "@/lib/email";
import { syncConfirmedReservationToRayza } from "@/lib/integrations/rayza-connect";
import { notifyManager } from "@/lib/notifications";

/**
 * The one place every "a payment just became successful" path should call —
 * regardless of channel (online Paystack, front-desk Cash/Card/Transfer,
 * cashier settle, or a manual staff confirm). Previously each of those five+
 * call sites duplicated the RAYZA sync, and only the online checkout path
 * ever sent the guest a receipt or alerted the manager — front-desk guests
 * got neither. Call this once, right after a payment's status flips to
 * "success" and its reservation is marked confirmed.
 */
/** Returns whether the manager alert (SMS/WhatsApp) went out. */
export async function handlePaymentConfirmed(
  payment: PaymentRecord,
  reservation: ReservationRecord,
): Promise<boolean> {
  await syncConfirmedReservationToRayza(reservation);

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
    guestName: `${reservation.firstName} ${reservation.lastName}`,
    phone: reservation.phone,
    summary: `₦${amountNgn.toLocaleString("en-NG")} deposit — ${payment.itemLabel}`,
  });

  return notifyResult.sent;
}
