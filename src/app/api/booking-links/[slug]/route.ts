import { resolveBookingLink } from "@/lib/booking-engine/booking-links";
import { NextResponse } from "next/server";

/** Public: the presets behind a booking link (rooms page uses it). */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const link = await resolveBookingLink((await params).slug);
  if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });
  return NextResponse.json({ ok: true, link });
}
