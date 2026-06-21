import type { PaymentRecord } from "@/lib/demo-store";
import {
  findPaymentByReference,
  updatePaymentByReference,
  updateReservationById,
} from "@/lib/demo-store";
import type { MoniepointTransactionStatus } from "@/lib/moniepoint";
import {
  getTerminalTransactionStatus,
  isMoniepointPaymentCancelled,
  isMoniepointPaymentSuccessful,
} from "@/lib/moniepoint";

export type MoniepointSyncResult = {
  payment: PaymentRecord;
  status: "success" | "failed" | "pending";
  moniepoint?: MoniepointTransactionStatus;
};

export async function confirmMoniepointPayment(
  reference: string,
  externalReference?: string,
): Promise<MoniepointSyncResult | null> {
  const payment = await findPaymentByReference(reference);
  if (!payment) return null;

  if (payment.status === "success") {
    return { payment, status: "success" };
  }

  const updatedPayment = await updatePaymentByReference(reference, {
    status: "success",
    externalReference,
  });

  if (payment.reservationId) {
    await updateReservationById(payment.reservationId, {
      status: "confirmed",
      paymentReference: reference,
    });
  }

  return {
    payment: updatedPayment ?? payment,
    status: "success",
  };
}

export async function failMoniepointPayment(
  reference: string,
): Promise<MoniepointSyncResult | null> {
  const payment = await findPaymentByReference(reference);
  if (!payment) return null;

  const updatedPayment = await updatePaymentByReference(reference, {
    status: "failed",
  });

  return {
    payment: updatedPayment ?? payment,
    status: "failed",
  };
}

/** Poll Moniepoint for terminal or bank-transfer push payments. */
export async function syncMoniepointPushPayment(
  reference: string,
): Promise<
  | { payment: PaymentRecord | undefined; synced: false; reason: "not_found" }
  | MoniepointSyncResult
> {
  const payment = await findPaymentByReference(reference);
  if (
    !payment ||
    (payment.paymentMethod !== "moniepoint_terminal" &&
      payment.paymentMethod !== "moniepoint_transfer")
  ) {
    return { payment, synced: false, reason: "not_found" };
  }

  if (payment.status === "success") {
    return { payment, status: "success" };
  }

  const tx = await getTerminalTransactionStatus(reference);

  if (isMoniepointPaymentSuccessful(tx)) {
    const confirmed = await confirmMoniepointPayment(
      reference,
      tx.transactionReference ?? undefined,
    );
    return confirmed ?? { payment, status: "pending", moniepoint: tx };
  }

  if (isMoniepointPaymentCancelled(tx)) {
    const failed = await failMoniepointPayment(reference);
    return failed
      ? { ...failed, moniepoint: tx }
      : { payment, status: "failed", moniepoint: tx };
  }

  return { payment, status: "pending", moniepoint: tx };
}

/** Extract our payment reference from varied Moniepoint webhook payloads. */
export function extractPaymentReference(
  payload: Record<string, unknown>,
): string | undefined {
  const direct = [
    payload.merchantReference,
    payload.merchant_reference,
    payload.paymentReference,
    payload.reference,
  ];

  for (const value of direct) {
    if (typeof value === "string" && value.startsWith("RH-")) {
      return value;
    }
  }

  const nested = payload.data ?? payload.responseBody ?? payload.body;
  if (nested && typeof nested === "object") {
    const fromNested = extractPaymentReference(nested as Record<string, unknown>);
    if (fromNested) return fromNested;
  }

  const textFields = [
    payload.narration,
    payload.metaData,
    payload.metadata,
    payload.description,
    payload.sessionId,
  ];

  for (const text of textFields) {
    if (typeof text !== "string") continue;
    const match = text.match(/RH-(?:MPOS|MPTF|CASH)-[A-Z0-9-]+/i);
    if (match) return match[0].toUpperCase();
  }

  return undefined;
}

export function extractAmountKobo(payload: Record<string, unknown>): number | undefined {
  const candidates = [
    payload.amount,
    payload.actualAmount,
    payload.requestAmount,
    payload.amountKobo,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && value > 0) {
      return Math.round(value);
    }
  }

  const nested = payload.data ?? payload.responseBody;
  if (nested && typeof nested === "object") {
    return extractAmountKobo(nested as Record<string, unknown>);
  }

  return undefined;
}

export function isTransferWebhookEvent(payload: Record<string, unknown>): boolean {
  const eventType = String(
    payload.eventType ?? payload.event ?? payload.type ?? "",
  ).toUpperCase();
  return (
    eventType.includes("TRANSFER") ||
    payload.actualPaymentMethod === "POS_TRANSFER" ||
    payload.requestPaymentMethod === "POS_TRANSFER"
  );
}

export function isSuccessfulWebhookPayload(
  payload: Record<string, unknown>,
): boolean {
  const code = String(payload.responseCode ?? payload.response_code ?? "");
  const status = String(
    payload.processingStatus ?? payload.status ?? "",
  ).toUpperCase();

  if (code === "00" || code === "0") return true;
  if (status === "PROCESSED" || status === "SUCCESS" || status === "COMPLETED") {
    return code === "" || code === "00" || code === "0";
  }
  return false;
}
