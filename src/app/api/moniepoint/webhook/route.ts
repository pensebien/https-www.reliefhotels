import { findPaymentByReference } from "@/lib/demo-store";
import {
  confirmMoniepointPayment,
  extractAmountKobo,
  extractPaymentReference,
  failMoniepointPayment,
  isSuccessfulWebhookPayload,
  isTransferWebhookEvent,
} from "@/lib/moniepoint-sync";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    let merchantReference = extractPaymentReference(payload);

    if (!merchantReference && isTransferWebhookEvent(payload)) {
      const amountKobo = extractAmountKobo(payload);
      if (amountKobo) {
        const { findPendingTransferPayment } = await import(
          "@/lib/payment-matching"
        );
        const matched = await findPendingTransferPayment(amountKobo);
        merchantReference = matched?.reference;
      }
    }

    if (!merchantReference) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payment = await findPaymentByReference(merchantReference);
    if (!payment) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const transactionReference =
      typeof payload.transactionReference === "string"
        ? payload.transactionReference
        : typeof payload.transaction_reference === "string"
          ? payload.transaction_reference
          : undefined;

    if (isSuccessfulWebhookPayload(payload)) {
      await confirmMoniepointPayment(merchantReference, transactionReference);
    } else if (
      String(payload.processingStatus ?? payload.status ?? "").toUpperCase() ===
      "CANCELLED"
    ) {
      await failMoniepointPayment(merchantReference);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[moniepoint/webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
