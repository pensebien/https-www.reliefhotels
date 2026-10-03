import { findReservationById } from "@/lib/demo-store";
import { assignRooms, autoAssignRooms, getAssignmentOptions } from "@/lib/room-assignment";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const assignSchema = z.union([
  z.object({ unitIds: z.array(z.string().min(1).max(100)).min(1).max(10) }),
  z.object({ auto: z.literal(true) }),
]);

/** Rooms of the booking's type, which are free for its nights, and the current assignment. */
export async function GET(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;

  const { id } = await context.params;
  const reservation = await findReservationById(id);
  if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  const options = await getAssignmentOptions(reservation);
  if (!options) {
    return NextResponse.json({ error: "This booking has no room type or dates" }, { status: 422 });
  }
  return NextResponse.json({ ok: true, ...options });
}

/** Assign or move rooms: `{ unitIds }`, or `{ auto: true }` for the minimise-gaps choice. */
export async function PUT(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;

  const { id } = await context.params;
  const parsed = assignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose rooms or auto-assign" }, { status: 400 });
  }

  try {
    if ("auto" in parsed.data) {
      const reservation = await findReservationById(id);
      if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
      const updated = await autoAssignRooms({ ...reservation, assignedUnits: undefined });
      if (!updated.assignedUnits?.length) {
        return NextResponse.json({ error: "No free rooms of this type on these nights" }, { status: 409 });
      }
      return NextResponse.json({ ok: true, reservation: updated });
    }

    const result = await assignRooms(id, parsed.data.unitIds);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, reservation: result.reservation });
  } catch (error) {
    console.error("[staff/reservations/rooms PUT]", error);
    return NextResponse.json({ error: "Unable to assign rooms" }, { status: 500 });
  }
}
