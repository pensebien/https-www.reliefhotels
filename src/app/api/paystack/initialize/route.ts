import { calculateDepositNgn } from "@/lib/booking-deposit";
import { findReservationById, updateReservationById } from "@/lib/demo-store";
import { initializePayment } from "@/lib/paystack";
import { paystackInitializeSchema } from "@/lib/schemas/payment";
import { rooms } from "@/content/site";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = paystackInitializeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      email,
      itemId,
      reservationId,
      nights = 1,
      demoAmountNgn,
    } = parsed.data;

    const reservation = await findReservationById(reservationId);
    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    if (reservation.status !== "pending") {
      return NextResponse.json(
        { error: "Reservation is not eligible for payment" },
        { status: 409 },
      );
    }

    const item = rooms.find((r) => r.id === itemId || r.slug === itemId);

    if (!item) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const amountNgn = demoAmountNgn ?? calculateDepositNgn(item.priceFrom, nights);
    const amountKobo = amountNgn * 100;
    const itemLabel = `${itemId} — ${nights} night(s) deposit (20%)`;

    const result = await initializePayment({
      email,
      amountKobo,
      itemType: "room",
      itemId,
      itemLabel,
      reservationId,
      metadata: { nights: String(nights) },
    });

    await updateReservationById(reservationId, {
      paymentReference: result.reference,
    });

    return NextResponse.json({
      ok: true,
      reference: result.reference,
      authorizationUrl: result.authorizationUrl,
      amountNgn,
      amountKobo,
      demo: result.demo,
    });
  } catch (error) {
    console.error("[paystack:initialize]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment initialization failed",
      },
      { status: 500 },
    );
  }
}
