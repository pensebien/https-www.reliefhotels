import { calculateDepositNgn } from "@/lib/booking-deposit";
import { findReservationById, updateReservationById } from "@/lib/demo-store";
import { initializePayment } from "@/lib/paystack";
import { paystackInitializeSchema } from "@/lib/schemas/payment";
import { rooms, tours } from "@/content/site";
import { NextResponse } from "next/server";

function resolveItem(itemType: "room" | "tour", itemId: string) {
  if (itemType === "room") {
    return rooms.find((r) => r.id === itemId || r.slug === itemId);
  }
  return tours.find((t) => t.id === itemId || t.slug === itemId);
}

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
      itemType,
      itemId,
      reservationId,
      nights = 1,
      guests = 1,
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

    const item = resolveItem(itemType, itemId);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const amountNgn =
      demoAmountNgn ??
      calculateDepositNgn(itemType, item.priceFrom, nights, guests);

    const amountKobo = amountNgn * 100;
    const itemLabel =
      itemType === "room"
        ? `${itemId} — ${nights} night(s) deposit (20%)`
        : `${itemId} — ${guests} guest(s)`;

    const result = await initializePayment({
      email,
      amountKobo,
      itemType,
      itemId,
      itemLabel,
      reservationId,
      metadata: { nights: String(nights), guests: String(guests) },
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
