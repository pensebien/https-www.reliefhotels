import { getServerConfig } from "@/lib/config";
import { confirmPaystackCharge, isValidPaystackSignature } from "@/lib/paystack-confirm";
import { NextResponse } from "next/server";

/**
 * Paystack webhook — primary path for marking an online deposit paid and
 * sending the payment receipt (docs/flow-diagrams/reservation/).
 *
 * Paystack dashboard → Settings → API Keys & Webhooks → Webhook URL:
 *   https://www.reliefhotelsandsuites.com/api/paystack/webhook
 */
export async function POST(request: Request) {
  const config = getServerConfig();
  const rawBody = await request.text();

  if (
    !isValidPaystackSignature(
      rawBody,
      request.headers.get("x-paystack-signature"),
      config.paystack.secretKey,
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: { reference?: string; amount?: number };
    };

    if (event.event !== "charge.success" || !event.data?.reference) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // An amount mismatch is still acknowledged (200) so Paystack stops
    // retrying; confirmPaystackCharge logs it for staff to reconcile.
    const result = await confirmPaystackCharge(event.data.reference, event.data.amount ?? 0);
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch (error) {
    console.error("[paystack/webhook]", error);
    // 500 makes Paystack retry — right for transient DB/email failures.
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
