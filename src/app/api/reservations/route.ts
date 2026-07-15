import { rooms } from "@/content/site";
import { addReservation } from "@/lib/demo-store";
import { sendReservationEmail } from "@/lib/email";
import { getRoomAvailability } from "@/lib/room-availability";
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

      const availability = await getRoomAvailability({
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        rooms: 1,
        guests: data.guests,
      });

      const match = availability.available.find(
        (entry) => entry.id === room.id || entry.slug === room.slug,
      );

      if (!match) {
        return NextResponse.json(
          {
            error:
              "This room is not available for the selected dates. Please choose different dates.",
          },
          { status: 409 },
        );
      }
    }

    const record = await addReservation({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      itemType: data.itemType,
      roomId: data.roomId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      nights: data.nights,
      guests: data.guests,
      stayPreference: data.stayPreference,
      message: data.message,
      emailSent: false,
      status: "pending",
    });

    const sent = await sendReservationEmail(record);
    if (sent) {
      record.emailSent = true;
    }

    return NextResponse.json({
      ok: true,
      id: record.id,
      emailSent: sent,
      notified: false,
      demo: !process.env.RESEND_API_KEY,
    });
  } catch (error) {
    console.error("[reservations]", error);
    return NextResponse.json(
      { error: "Unable to process reservation" },
      { status: 500 },
    );
  }
}
