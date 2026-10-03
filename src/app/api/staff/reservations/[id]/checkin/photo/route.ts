import { findCheckin, readIdPhoto } from "@/lib/checkin/store";
import { findReservationById } from "@/lib/demo-store";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** The guest's ID photo, for cashier/manager only; never cached. */
export async function GET(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const reservation = await findReservationById(id);
  const checkin = reservation ? await findCheckin(reservation.groupId ?? reservation.id) : undefined;
  const photo = checkin ? await readIdPhoto(checkin) : null;
  if (!photo) return NextResponse.json({ error: "No ID photo" }, { status: 404 });
  return new NextResponse(Buffer.from(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
