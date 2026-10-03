import { loadManagedBooking } from "@/lib/booking-engine/manage-service";
import { updateReservationById } from "@/lib/demo-store";
import { initializePayment } from "@/lib/paystack";
import { NextResponse } from "next/server";

/** Pays what the manage-booking page shows as due: the deposit, or the balance after it. */
export async function POST(request: Request) {
  const result = await loadManagedBooking(await request.json().catch(() => null));
  if (!result.ok) return result.response;

  const { reservation, members, view, config } = result.booking;
  const pending = members.filter((m) => m.status === "pending");
  if (!view.amountDueKind || view.amountDueNgn <= 0) {
    return NextResponse.json({ error: "Nothing is due on this booking" }, { status: 409 });
  }

  try {
    if (view.amountDueKind === "deposit") {
      const holdExpiresAt = new Date(Date.now() + config.holdMinutes * 60_000).toISOString();
      await Promise.all(
        pending.filter((m) => m.holdExpiresAt).map((m) => updateReservationById(m.id, { holdExpiresAt })),
      );
    }

    const payment = await initializePayment({
      email: reservation.email,
      amountKobo: view.amountDueNgn * 100,
      itemType: "room",
      itemId: reservation.roomId ?? "room",
      itemLabel: `${reservation.roomId} — ${view.amountDueKind === "deposit" ? `deposit (${config.depositPct}%)` : "balance"}`,
      reservationId: reservation.id,
      metadata: { purpose: view.amountDueKind },
    });

    if (view.amountDueKind === "deposit") {
      await Promise.all(
        pending.map((m) => updateReservationById(m.id, { paymentReference: payment.reference })),
      );
    }

    return NextResponse.json({
      ok: true,
      reference: payment.reference,
      authorizationUrl: payment.authorizationUrl,
      amountNgn: view.amountDueNgn,
      demo: payment.demo,
    });
  } catch (error) {
    console.error("[booking/manage/pay]", error);
    return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 });
  }
}
