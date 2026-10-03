import { rooms } from "@/content/site";
import { getRateConfig } from "@/lib/booking-engine/rate-config";
import { reserveGroup, reserveRoom } from "@/lib/booking-engine/reserve";
import { addReservation, type ReservationRecord } from "@/lib/demo-store";
import { sendGuestReservationConfirmation, sendReservationEmail } from "@/lib/email";
import { isGuestBlocked } from "@/lib/guests/profiles";
import { roomDisplayName } from "@/lib/room-names";
import { reservationSchema } from "@/lib/schemas/reservation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reservation data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    // Guests staff have blocked can't book online; the message stays neutral.
    if (await isGuestBlocked(data.email)) {
      return NextResponse.json(
        { error: "We couldn't complete this booking online. Please contact the hotel.", code: "contact_hotel" },
        { status: 403 },
      );
    }
    const engine = (await getRateConfig()).engine;
    if (data.itemType === "room" && engine.arrivalTimeField === "required" && !data.arrivalTime) {
      return NextResponse.json({ error: "Please tell us your expected arrival time" }, { status: 400 });
    }
    // Request mode: guest bookings wait for staff approval and hold the room until then.
    const requestMode = data.itemType === "room" && engine.mode === "request";
    const reserveOptions = requestMode ? { expiringHold: false } : {};
    const guest = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      stayPreference: data.stayPreference,
      message: data.arrivalTime ? `Estimated arrival: ${data.arrivalTime}\n\n${data.message}` : data.message,
    };

    let record: ReservationRecord;
    let quote: { totalNgn: number; depositNgn: number } | undefined;
    /** What the emails describe — for a group, the whole group. */
    let emailRecord: ReservationRecord | undefined;

    if (data.itemType === "room") {
      const roomId = data.roomId;
      if (!roomId) {
        return NextResponse.json(
          { error: "Room is required for room reservations" },
          { status: 400 },
        );
      }

      const room = rooms.find((r) => r.id === roomId || r.slug === roomId);
      if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }

      if (!data.checkIn || !data.checkOut) {
        return NextResponse.json(
          { error: "Check-in and check-out dates are required" },
          { status: 400 },
        );
      }

      // Group booking: several room types in one checkout, one payment.
      if (data.stays && data.stays.length > 1) {
        const group = await reserveGroup(
          {
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            guests: data.guests,
            stays: data.stays,
            couponCode: data.couponCode || undefined,
            extraIds: data.extraIds,
            ratePlanId: data.ratePlanId || undefined,
          },
          guest,
          reserveOptions,
        );
        if (!group.ok) {
          return NextResponse.json(
            { error: group.message, code: group.code },
            { status: group.status },
          );
        }
        record = group.lead;
        quote = group.quote;
        emailRecord = {
          ...group.lead,
          quotedTotalNgn: group.quote.totalNgn,
          quotedDepositNgn: group.quote.depositNgn,
          units: group.records.reduce((n, r) => n + (r.units ?? 1), 0),
          guests: data.guests,
          stayPreference: `Group booking: ${group.records
            .map((r) => `${r.units ?? 1} × ${roomDisplayName(r.roomId)}`)
            .join(", ")}`,
        };
      } else {
        // Server re-quotes (price, restrictions, coupon) and checks
        // availability atomically with the insert — client nights/prices are
        // never trusted.
        const result = await reserveRoom(
          {
            roomId: room.id,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            guests: data.guests,
            rooms: data.rooms,
            couponCode: data.couponCode || undefined,
            extraIds: data.extraIds,
            ratePlanId: data.ratePlanId || undefined,
          },
          guest,
          reserveOptions,
        );

        if (!result.ok) {
          return NextResponse.json(
            { error: result.message, code: result.code },
            { status: result.status },
          );
        }
        record = result.record;
        quote = result.quote;
      }
    } else {
      record = await addReservation({
        ...guest,
        itemType: data.itemType,
        roomId: data.roomId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        nights: data.nights,
        guests: data.guests,
        emailSent: false,
        status: "pending",
      });
    }

    const [sent] = await Promise.all([
      sendReservationEmail(emailRecord ?? record),
      sendGuestReservationConfirmation(emailRecord ?? record),
    ]);
    if (sent) {
      record.emailSent = true;
    }

    return NextResponse.json({
      ok: true,
      id: record.id,
      emailSent: sent,
      notified: false,
      demo: !process.env.RESEND_API_KEY,
      requiresApproval: requestMode,
      ...(quote
        ? {
            totalNgn: quote.totalNgn,
            depositNgn: quote.depositNgn,
            holdExpiresAt: record.holdExpiresAt,
          }
        : {}),
    });
  } catch (error) {
    console.error("[reservations]", error);
    return NextResponse.json(
      { error: "Unable to process reservation" },
      { status: 500 },
    );
  }
}
