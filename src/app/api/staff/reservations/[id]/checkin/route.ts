import { findCheckin } from "@/lib/checkin/store";
import { findReservationById } from "@/lib/demo-store";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** Online check-in details for a booking (its group lead holds them). */
export async function GET(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const reservation = await findReservationById(id);
  if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  const checkin = await findCheckin(reservation.groupId ?? reservation.id);
  if (!checkin) return NextResponse.json({ ok: true, checkin: null });
  const { idPhotoPath, idPhotoContentType: _type, ...rest } = checkin;
  return NextResponse.json({ ok: true, checkin: { ...rest, hasPhoto: Boolean(idPhotoPath) } });
}
