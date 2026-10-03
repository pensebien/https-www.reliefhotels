import { deleteRoomBlock } from "@/lib/db/inventory-store";
import { listRoomStatus, setRoomStatus } from "@/lib/housekeeping/store";
import { getRoomSetup, unitIdsFor } from "@/lib/room-setup";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

type RouteContext = { params: Promise<{ unitId: string }> };
const schema = z.object({ status: z.enum(["clean", "dirty"]) });

/** Mark a room clean (releasing its check-out hold) or dirty. */
export async function PUT(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["cleaner_head", "manager"]);
  if (!access.ok) return access.response;
  const { unitId } = await context.params;
  const setup = await getRoomSetup();
  if (!setup.rooms.some((r) => unitIdsFor(r).includes(unitId))) {
    return NextResponse.json({ error: "Unknown room" }, { status: 404 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose clean or dirty" }, { status: 400 });

  const current = (await listRoomStatus()).find((r) => r.unitId === unitId);
  if (parsed.data.status === "clean" && current?.blockId) {
    await deleteRoomBlock(current.blockId).catch(() => false);
  }
  const saved = await setRoomStatus({
    unitId,
    status: parsed.data.status,
    blockId: parsed.data.status === "clean" ? undefined : current?.blockId,
    updatedBy: access.session?.name,
  });
  return NextResponse.json({ ok: true, room: saved });
}
