import { createHmac, timingSafeEqual } from "node:crypto";
import {
  findPaymentByReference,
  updatePaymentByReference,
  updateReservationById,
  type PaymentRecord,
} from "@/lib/demo-store";
import { handlePaymentConfirmed } from "@/lib/payment-confirmed";

/**
 * https://paystack.com/docs/payments/webhooks/ — every event is signed with
 * HMAC-SHA512 of the raw request body using the secret key, sent in the
 * x-paystack-signature header.
 */
export function isValidPaystackSignature(
  rawBody: string,
  signature: string | null,
  secretKey: string,
): boolean {
  if (!signature || !secretKey) return false;
  const expected = Buffer.from(createHmac("sha512", secretKey).update(rawBody).digest("hex"));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export type PaystackConfirmResult =
  | { outcome: "confirmed"; payment: PaymentRecord; notified: boolean }
  | { outcome: "already_confirmed"; payment: PaymentRecord }
  | { outcome: "amount_mismatch"; expected: number; actual: number }
  | { outcome: "unknown_reference" };

/**
 * Marks a successful Paystack charge as paid, confirms its reservation, and
 * sends the payment receipt (via handlePaymentConfirmed). Shared by the
 * charge.success webhook (primary path) and the /payment/callback verify
 * route (fallback when the webhook is late or not configured) — whichever
 * arrives first wins; the other sees "already_confirmed" and sends nothing.
 *
 * amountKobo is what Paystack reports was charged; pass 0 to skip the check
 * (demo verify only).
 */
export async function confirmPaystackCharge(
  reference: string,
  amountKobo: number,
): Promise<PaystackConfirmResult> {
  const existing = await findPaymentByReference(reference);
  if (!existing) return { outcome: "unknown_reference" };
  if (existing.status === "success") {
    return { outcome: "already_confirmed", payment: existing };
  }

  if (amountKobo > 0 && existing.amountKobo && amountKobo !== existing.amountKobo) {
    console.error("[paystack:confirm] amount mismatch", {
      reference,
      expected: existing.amountKobo,
      actual: amountKobo,
    });
    return { outcome: "amount_mismatch", expected: existing.amountKobo, actual: amountKobo };
  }

  const updated = (await updatePaymentByReference(reference, { status: "success" })) ?? existing;
  let notified = false;

  if (updated.reservationId) {
    const confirmed = await updateReservationById(updated.reservationId, {
      status: "confirmed",
      paymentReference: reference,
    });
    if (confirmed) {
      notified = await handlePaymentConfirmed(updated, confirmed);
    }
  }

  return { outcome: "confirmed", payment: updated, notified };
}
