/**
 * Refunds, recorded as negative payment rows linked to the payment they
 * reverse (externalReference = original reference), so the accounting ledger
 * and invoices net them automatically.
 *
 * - Online Paystack payments: refunded through Paystack's refund API; the row
 *   stays "pending" until the refund.processed / refund.failed webhook.
 *   Demo mode simulates an instant refund.
 * - Everything else (cash, card terminals, transfers): a manual refund the
 *   desk hands back; recorded as done immediately.
 */

import { getServerConfig } from "@/lib/config";
import {
  addPayment,
  findPendingRefund,
  findReservationById,
  listPaymentsForReservation,
  updatePaymentByReference,
  updateReservationById,
  type PaymentRecord,
} from "@/lib/demo-store";
import { paystackFetch } from "@/lib/paystack-auth";
import { randomBytes } from "crypto";

export type RefundablePayment = {
  reference: string;
  method: string;
  paidNgn: number;
  refundedNgn: number;
  refundableNgn: number;
  /** Refund goes back through Paystack; otherwise staff refund by hand. */
  viaPaystack: boolean;
  createdAt: string;
};

const isRefund = (p: PaymentRecord) => p.amountKobo < 0;

function refundableFrom(payments: PaymentRecord[]): RefundablePayment[] {
  return payments
    .filter((p) => !isRefund(p) && p.status === "success")
    .map((p) => {
      const refundedKobo = payments
        .filter((r) => isRefund(r) && r.externalReference === p.reference && r.status !== "failed")
        .reduce((sum, r) => sum - r.amountKobo, 0);
      const paidNgn = Math.round(p.amountKobo / 100);
      const refundedNgn = Math.round(refundedKobo / 100);
      return {
        reference: p.reference,
        method: p.paymentMethod ?? p.paymentChannel ?? "paystack",
        paidNgn,
        refundedNgn,
        refundableNgn: Math.max(0, paidNgn - refundedNgn),
        viaPaystack: (p.paymentMethod ?? "paystack") === "paystack",
        createdAt: p.createdAt,
      };
    });
}

export async function listRefundablePayments(reservationId: string) {
  const payments = await listPaymentsForReservation(reservationId);
  return {
    payments: refundableFrom(payments),
    refunds: payments
      .filter(isRefund)
      .map((r) => ({
        reference: r.reference,
        refundOf: r.externalReference,
        amountNgn: Math.round(-r.amountKobo / 100),
        status: r.status,
        reason: r.itemLabel,
        createdAt: r.createdAt,
      })),
  };
}

export type RefundResult =
  | { ok: true; reference: string; status: "success" | "pending"; viaPaystack: boolean }
  | { ok: false; status: 404 | 409 | 422 | 502; error: string };

function refundReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RF-${date}-${randomBytes(4).toString("hex")}`;
}

export async function refundPayment(input: {
  reservationId: string;
  paymentReference: string;
  amountNgn: number;
  reason: string;
  staffName?: string;
}): Promise<RefundResult> {
  const reservation = await findReservationById(input.reservationId);
  if (!reservation) return { ok: false, status: 404, error: "Reservation not found" };

  const payments = await listPaymentsForReservation(input.reservationId);
  const original = payments.find((p) => p.reference === input.paymentReference && !isRefund(p));
  if (!original) return { ok: false, status: 404, error: "Payment not found on this booking" };
  const refundable = refundableFrom(payments).find((p) => p.reference === original.reference);
  if (!refundable || original.status !== "success") {
    return { ok: false, status: 422, error: "Only successful payments can be refunded" };
  }
  if (input.amountNgn > refundable.refundableNgn) {
    return {
      ok: false,
      status: 409,
      error: `At most ₦${refundable.refundableNgn.toLocaleString("en-NG")} can still be refunded on this payment`,
    };
  }

  const config = getServerConfig();
  let status: "success" | "pending" = "success";
  if (refundable.viaPaystack && !config.demoMode && config.paystack.configured) {
    const res = await paystackFetch(config.paystack.secretKey, "/refund", {
      method: "POST",
      body: JSON.stringify({
        transaction: original.reference,
        amount: input.amountNgn * 100,
        merchant_note: input.reason.slice(0, 200),
      }),
    });
    const body = (await res.json().catch(() => null)) as {
      status?: boolean;
      message?: string;
      data?: { status?: string };
    } | null;
    if (!res.ok || !body?.status) {
      return { ok: false, status: 502, error: body?.message ?? "Paystack did not accept the refund" };
    }
    status = body.data?.status === "processed" ? "success" : "pending";
  }

  const reference = refundReference();
  await addPayment({
    reference,
    reservationId: reservation.id,
    email: reservation.email,
    amountKobo: -input.amountNgn * 100,
    currency: "NGN",
    status,
    itemType: "room",
    itemId: reservation.roomId ?? "room",
    itemLabel: `Refund — ${input.reason}`.slice(0, 200),
    paymentMethod: original.paymentMethod,
    paymentChannel: original.paymentChannel,
    externalReference: original.reference,
  });

  const note = `Refund ₦${input.amountNgn.toLocaleString("en-NG")} of ${original.reference} ${
    refundable.viaPaystack ? "via Paystack" : "by hand"
  }${input.staffName ? ` by ${input.staffName}` : ""}: ${input.reason}`;
  await updateReservationById(reservation.id, {
    staffNotes: reservation.staffNotes ? `${note}\n${reservation.staffNotes}` : note,
  });

  return { ok: true, reference, status, viaPaystack: refundable.viaPaystack };
}

/**
 * Paystack refund webhook: settle our pending refund row for that
 * transaction and amount. Returns whether a row was updated.
 */
export async function settlePaystackRefund(input: {
  transactionReference: string;
  amountKobo: number;
  processed: boolean;
}): Promise<boolean> {
  const row = await findPendingRefund(input.transactionReference, -Math.abs(input.amountKobo));
  if (!row) return false;
  await updatePaymentByReference(row.reference, { status: input.processed ? "success" : "failed" });
  return true;
}
