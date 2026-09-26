import { getServerConfig } from "@/lib/config";
import { findPaymentByReference, updatePaymentByReference } from "@/lib/demo-store";
import { verifyPayment } from "@/lib/paystack";
import { confirmPaystackCharge } from "@/lib/paystack-confirm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");
  const demo = searchParams.get("demo") === "1";

  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  try {
    const config = getServerConfig();
    // demo=1 only works when DEMO_MODE / missing keys — never with live/test keys alone
    const allowDemoBypass = config.demoMode && demo;

    const existing = await findPaymentByReference(reference);
    if (existing?.status === "success") {
      return NextResponse.json({
        ok: true,
        status: "success",
        reference,
        amountKobo: existing.amountKobo,
        email: existing.email,
        reservationId: existing.reservationId,
        notified: false,
        alreadyConfirmed: true,
        demo: config.demoMode,
      });
    }

    const result = await verifyPayment(reference, allowDemoBypass);
    const payment = existing;
    let notified = false;

    if (result.status === "success") {
      // Fallback for the charge.success webhook (api/paystack/webhook) — same
      // confirm + receipt path, so the guest gets exactly one receipt.
      const confirmed = await confirmPaystackCharge(
        reference,
        result.demo ? 0 : result.amountKobo,
      );
      if (confirmed.outcome === "amount_mismatch") {
        return NextResponse.json(
          {
            ok: false,
            status: "failed",
            reference,
            error: "Payment amount does not match reservation deposit",
          },
          { status: 409 },
        );
      }
      if (confirmed.outcome === "confirmed") notified = confirmed.notified;
    } else if (result.status === "failed") {
      await updatePaymentByReference(reference, { status: "failed" });
    }

    const reservationId = payment?.reservationId ?? undefined;
    const email = result.email || payment?.email;

    return NextResponse.json({
      ok: true,
      status: result.status,
      reference: result.reference,
      amountKobo: result.amountKobo,
      email,
      reservationId,
      notified,
      demo: result.demo || config.demoMode,
    });
  } catch (error) {
    console.error("[paystack:verify]", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 },
    );
  }
}
