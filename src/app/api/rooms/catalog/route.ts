import { getRoomSetup } from "@/lib/room-setup";
import { NextResponse } from "next/server";

/**
 * Public, cacheable view of staff room setup for the website: which room
 * types are sold online and the photos to show. Inventory and room numbers
 * stay private.
 */
export async function GET() {
  const setup = await getRoomSetup();
  return NextResponse.json(
    {
      ok: true,
      rooms: setup.rooms.map((r) => ({
        id: r.roomId,
        bookableOnline: r.bookableOnline,
        photos: r.photos,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
