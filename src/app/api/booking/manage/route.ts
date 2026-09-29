import { loadManagedBooking } from "@/lib/booking-engine/manage-service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await loadManagedBooking({
    id: searchParams.get("id"),
    t: searchParams.get("t"),
  });
  if (!result.ok) return result.response;

  const { view, config } = result.booking;
  return NextResponse.json({
    ok: true,
    booking: view,
    policy: config.cancellation,
    extras: config.extras
      .filter((e) => view.extraIds?.includes(e.id))
      .map((e) => ({ id: e.id, label: e.label })),
  });
}
