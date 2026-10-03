import { getRoomSetup, RoomSetupValidationError, saveRoomSetup } from "@/lib/room-setup";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;

  try {
    return NextResponse.json({ ok: true, setup: await getRoomSetup() });
  } catch (error) {
    console.error("[staff/settings/rooms GET]", error);
    return NextResponse.json({ error: "Unable to load room setup" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;

  try {
    const setup = await saveRoomSetup(await request.json());
    return NextResponse.json({ ok: true, setup });
  } catch (error) {
    if (error instanceof RoomSetupValidationError) {
      return NextResponse.json(
        { error: "Invalid room setup", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("[staff/settings/rooms PUT]", error);
    return NextResponse.json({ error: "Unable to save room setup" }, { status: 500 });
  }
}
