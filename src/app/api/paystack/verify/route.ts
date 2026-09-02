import { getServerConfig } from "@/lib/config";
import {
  findPaymentByReference,
  updatePaymentByReference,
  updateReservationById,
} from "@/lib/demo-store";
import { handlePaymentConfirmed } from "@/lib/payment-confirmed";
import { verifyPayment } from "@/lib/paystack";
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

    if (
      result.status === "success" &&
      !result.demo &&
      existing?.amountKobo &&
      result.amountKobo > 0 &&
      result.amountKobo !== existing.amountKobo
    ) {
      console.error("[paystack:verify] amount mismatch", {
        reference,
        expected: existing.amountKobo,
        actual: result.amountKobo,
      });
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

    const payment = existing ?? (await findPaymentByReference(reference));
    let notified = false;

    if (result.status === "success") {
      const updated = await updatePaymentByReference(reference, {
        status: "success",
      });

      if (updated?.reservationId) {
        const confirmed = await updateReservationById(updated.reservationId, {
          status: "confirmed",
          paymentReference: reference,
        });
        if (confirmed) {
          notified = await handlePaymentConfirmed(updated, confirmed);
        }
      }
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
