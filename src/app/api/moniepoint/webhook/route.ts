import { Logger } from "@/lib/logger";
import { recordOpsError } from "@/lib/ops-status";
import { extractPaymentReference, syncMoniepointPushPayment } from "@/lib/moniepoint-sync";
import { guardPublicPost } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const log = new Logger("payments");

/**
 * Moniepoint notification. It is unsigned, so its contents are never trusted:
 * it only prompts us to ask Moniepoint's API for the payment's real status
 * (syncMoniepointPushPayment), which is what confirms a booking. Only payments
 * made through Moniepoint are looked up. Bank transfers without our reference
 * can't be verified this way and are left for staff to confirm in the Cashier.
 */
export async function POST(request: Request) {
  const limited = guardPublicPost(request, "moniepoint-webhook", { limit: 120, windowMs: 600_000 });
  if (limited) return limited;

  try {
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const reference = payload ? extractPaymentReference(payload) : undefined;
    if (!reference) {
      log.info("Moniepoint notice without our reference ignored; record transfers in the staff bookings view");
      return NextResponse.json({ ok: true, ignored: true });
    }

    const result = await syncMoniepointPushPayment(reference);
    if (!("status" in result)) return NextResponse.json({ ok: true, ignored: true });
    return NextResponse.json({ ok: true, status: result.status });
  } catch (error) {
    log.error("Moniepoint webhook failed", { error: error instanceof Error ? error.message : String(error) });
    await recordOpsError("payments", "Moniepoint webhook failed");
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
