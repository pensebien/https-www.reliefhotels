import { parseBookingSearchParams } from "@/lib/booking-search";
import { getRoomAvailability } from "@/lib/room-availability";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseBookingSearchParams(searchParams);

  if (!query) {
    return NextResponse.json(
      {
        error: "Invalid or missing checkIn/checkOut dates (YYYY-MM-DD, check-out after check-in).",
      },
      { status: 400 },
    );
  }

  try {
    const result = await getRoomAvailability(query);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[rooms/availability]", error);
    return NextResponse.json(
      { error: "Unable to load room availability" },
      { status: 500 },
    );
  }
}
