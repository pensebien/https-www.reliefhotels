import { guardPublicPost } from "@/lib/rate-limit";
import { calculateDepositNgn } from "@/lib/booking-deposit";
import { getBookingSettings } from "@/lib/booking-engine/booking-settings";
import { getServerConfig } from "@/lib/config";
import { findReservationById, updateReservationById } from "@/lib/demo-store";
import { initializePayment } from "@/lib/paystack";
import { paystackInitializeSchema } from "@/lib/schemas/payment";
import { rooms } from "@/content/site";
import { pluralize } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const limited = guardPublicPost(request, "paystack-init", { limit: 20, windowMs: 600_000 });
  if (limited) return limited;
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

    const config = getServerConfig();

    if (demoAmountNgn != null && !config.demoMode) {
      return NextResponse.json(
        {
          error:
            "demoAmountNgn is only allowed in DEMO_MODE (or when Paystack keys are not configured)",
        },
        { status: 400 },
      );
    }

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

    // Price from the stored reservation, never from client-sent nights —
    // otherwise a 7-night booking could pay a 1-night deposit. Online
    // bookings carry the deposit locked in from RAYZA's price when created.
    const settings = getBookingSettings();
    const chargedNights = reservation.nights ?? nights;
    const depositNgn = reservation.quotedDepositNgn ?? calculateDepositNgn(item.priceFrom, chargedNights);
    const depositPct = reservation.quotedDepositNgn !== undefined ? settings.depositPct : 20;

    if (reservation.holdExpiresAt) {
      if (new Date(reservation.holdExpiresAt).getTime() <= Date.now()) {
        return NextResponse.json(
          {
            error: "Your room hold has expired. Please search again to re-check availability.",
            code: "hold_expired",
          },
          { status: 409 },
        );
      }
      // Guest is paying now — keep the room held while Paystack completes.
      const holdExpiresAt = new Date(Date.now() + settings.holdMinutes * 60_000).toISOString();
      await updateReservationById(reservation.id, { holdExpiresAt });
    }

    const amountNgn = demoAmountNgn ?? depositNgn;
    const amountKobo = amountNgn * 100;
    const itemLabel = `${itemId} — ${pluralize(chargedNights, "night")} deposit (${depositPct}%)`;

    const result = await initializePayment({
      email,
      amountKobo,
      itemType: "room",
      itemId,
      itemLabel,
      reservationId,
      metadata: { nights: String(chargedNights) },
    });

    await updateReservationById(reservation.id, { paymentReference: result.reference });

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
