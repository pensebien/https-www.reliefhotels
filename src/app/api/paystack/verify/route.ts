import { getServerConfig } from "@/lib/config";
import {
  findPaymentByReference,
  findReservationById,
  updatePaymentByReference,
  updateReservationById,
} from "@/lib/demo-store";
import { sendPaymentConfirmationEmail } from "@/lib/email";
import { notifyManager } from "@/lib/notifications";
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
    const isDemoFlow =
      demo === true || (config.demoMode && searchParams.get("demo") !== "0");

    const result = await verifyPayment(reference, isDemoFlow);

    const payment = await findPaymentByReference(reference);
    let notified = false;

    if (result.status === "success") {
      const updated = await updatePaymentByReference(reference, {
        status: "success",
      });

      if (updated?.reservationId) {
        await updateReservationById(updated.reservationId, {
          status: "confirmed",
          paymentReference: reference,
        });
      }

      const email = result.email || updated?.email;
      const amountKobo = result.amountKobo || updated?.amountKobo || 0;

      if (email && amountKobo) {
        await sendPaymentConfirmationEmail({
          email,
          reference,
          amountKobo,
          itemLabel: updated?.itemLabel ?? "Relief Hotels booking",
        });
        const amountNgn = Math.round(amountKobo / 100);
        const reservation = updated?.reservationId
          ? await findReservationById(updated.reservationId)
          : null;
        const guestName = reservation
          ? `${reservation.firstName} ${reservation.lastName}`
          : undefined;

        const notifyResult = await notifyManager({
          event: "payment.verified",
          referenceId: reference,
          email,
          guestName,
          phone: reservation?.phone,
          summary: `₦${amountNgn.toLocaleString("en-NG")} deposit — ${updated?.itemLabel ?? "booking"}`,
        });
        notified = notifyResult.sent;
      }
    } else if (result.status === "failed") {
      await updatePaymentByReference(reference, { status: "failed" });
    }

    const reservationId = payment?.reservationId ?? undefined;

    return NextResponse.json({
      ok: true,
      status: result.status,
      reference: result.reference,
      amountKobo: result.amountKobo,
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
