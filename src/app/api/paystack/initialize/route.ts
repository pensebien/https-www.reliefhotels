import { guardPublicPost } from "@/lib/rate-limit";
import { calculateDepositNgn } from "@/lib/booking-deposit";
import { quoteStay } from "@/lib/booking-engine/quote";
import { getRateConfig } from "@/lib/booking-engine/rate-config";
import { getServerConfig } from "@/lib/config";
import { findReservationById, listGroupMembers, updateReservationById } from "@/lib/demo-store";
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
    // otherwise a 7-night booking could pay a 1-night deposit. Booking-engine
    // reservations carry the deposit locked in when they were created.
    const rateConfig = await getRateConfig();
    // A group booking pays one deposit covering every room type in it.
    const members = (await listGroupMembers(reservation)).filter((m) => m.status === "pending");
    const group = members.length > 1 ? members : null;
    let depositNgn: number;
    let chargedNights = reservation.nights ?? nights;
    let depositPct = rateConfig.depositPct;
    if (group && group.every((m) => m.quotedDepositNgn !== undefined)) {
      depositNgn = group.reduce((sum, m) => sum + (m.quotedDepositNgn ?? 0), 0);
    } else if (reservation.quotedDepositNgn !== undefined) {
      depositNgn = reservation.quotedDepositNgn;
    } else if (reservation.checkIn && reservation.checkOut) {
      const quote = quoteStay(
        {
          roomId: item.id,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          guests: reservation.guests,
          rooms: reservation.units,
        },
        rateConfig,
      );
      if (!quote.ok) {
        return NextResponse.json({ error: quote.message }, { status: 409 });
      }
      depositNgn = quote.depositNgn;
      chargedNights = quote.nights;
      depositPct = quote.depositPct;
    } else {
      depositNgn = calculateDepositNgn(item.priceFrom, chargedNights);
      depositPct = 20;
    }

    const holders = group ?? [reservation];
    if (holders.some((m) => m.holdExpiresAt)) {
      if (holders.some((m) => m.holdExpiresAt && new Date(m.holdExpiresAt).getTime() <= Date.now())) {
        return NextResponse.json(
          {
            error:
              "Your room hold has expired. Please search again to re-check availability.",
            code: "hold_expired",
          },
          { status: 409 },
        );
      }
      // Guest is paying now — keep every room held while Paystack completes.
      const holdExpiresAt = new Date(Date.now() + rateConfig.holdMinutes * 60_000).toISOString();
      await Promise.all(holders.map((m) => updateReservationById(m.id, { holdExpiresAt })));
    }

    const amountNgn = demoAmountNgn ?? depositNgn;
    const amountKobo = amountNgn * 100;
    const itemLabel = group
      ? `Group booking (${group.length} room types) — ${pluralize(chargedNights, "night")} deposit (${depositPct}%)`
      : `${itemId} — ${pluralize(chargedNights, "night")} deposit (${depositPct}%)`;

    const result = await initializePayment({
      email,
      amountKobo,
      itemType: "room",
      itemId,
      itemLabel,
      reservationId,
      metadata: { nights: String(chargedNights) },
    });

    await Promise.all(
      holders.map((m) => updateReservationById(m.id, { paymentReference: result.reference })),
    );

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
