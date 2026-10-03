import { rooms } from "@/content/site";
import { getBookingLinks, saveBookingLinks } from "@/lib/booking-engine/booking-links";
import { getRateConfig } from "@/lib/booking-engine/rate-config";
import { roomDisplayName } from "@/lib/room-names";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const [links, config] = await Promise.all([getBookingLinks(), getRateConfig()]);
  return NextResponse.json({
    ok: true,
    links,
    rooms: rooms.map((r) => ({ id: r.id, name: roomDisplayName(r.id) })),
    ratePlans: config.ratePlans.map(({ id, label }) => ({ id, label })),
    coupons: config.coupons.map((c) => c.code),
  });
}

export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  try {
    return NextResponse.json({ ok: true, links: await saveBookingLinks(await request.json()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid links" }, { status: 400 });
  }
}
