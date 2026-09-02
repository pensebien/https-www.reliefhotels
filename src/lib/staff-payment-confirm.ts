import { findPaymentByReference } from "@/lib/demo-store";
import type { PaymentRecord } from "@/lib/demo-store";
import { confirmMoniepointPayment } from "@/lib/moniepoint-sync";

/** Card/Transfer methods that can sit pending with no real terminal to verify them. */
const MANUALLY_CONFIRMABLE_METHODS = new Set([
  "moniepoint_terminal",
  "moniepoint_transfer",
  "paystack_terminal",
]);

export type ManualConfirmResult =
  | { ok: true; payment: PaymentRecord }
  | { ok: false; reason: "not_found" | "not_pending" | "not_confirmable" };

/**
 * Lets front-desk staff attest that a Card/Transfer payment was received when
 * there's no real terminal or webhook to verify it automatically (terminals
 * aren't provisioned yet) — the same trust model Cash already relies on:
 * staff attest payment happened, nothing auto-verifies it.
 *
 * Delegates to confirmMoniepointPayment for the actual success + reservation
 * confirm + RAYZA sync, since that logic is provider-agnostic despite its name.
 */
export async function manuallyConfirmPendingPayment(
  reference: string,
): Promise<ManualConfirmResult> {
  const payment = await findPaymentByReference(reference);
  if (!payment) return { ok: false, reason: "not_found" };

  if (
    !payment.paymentMethod ||
    !MANUALLY_CONFIRMABLE_METHODS.has(payment.paymentMethod)
  ) {
    return { ok: false, reason: "not_confirmable" };
  }
  if (payment.status !== "pending") {
    return { ok: false, reason: "not_pending" };
  }

  const result = await confirmMoniepointPayment(
    reference,
    payment.externalReference ?? "STAFF-MANUAL-CONFIRM",
  );
  if (!result) return { ok: false, reason: "not_found" };

  return { ok: true, payment: result.payment };
}
