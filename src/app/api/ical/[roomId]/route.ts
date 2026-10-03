import { isValidFeedToken } from "@/lib/booking-engine/manage-link";
import { buildIcalFeed } from "@/lib/channels/ical";
import { fullyBookedDays } from "@/lib/channels/export";
import { roomDisplayName } from "@/lib/room-names";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ roomId: string }> };

/** Calendar export for one room type: fully booked days for the next year. */
export async function GET(request: Request, context: RouteContext) {
  const { roomId } = await context.params;
  const token = new URL(request.url).searchParams.get("t");
  if (!isValidFeedToken(roomId, token)) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }
  const feed = buildIcalFeed({
    calendarName: `Relief Hotels — ${roomDisplayName(roomId)}`,
    roomId,
    unavailableDays: await fullyBookedDays(roomId),
  });
  return new NextResponse(feed, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
