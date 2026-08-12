import { deleteRoomBlock } from "@/lib/db/inventory-store";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["cleaner_head", "manager"]);
  if (!access.ok) return access.response;

  const { id } = await context.params;

  try {
    const removed = await deleteRoomBlock(id);
    if (!removed) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[staff/room-blocks DELETE]", error);
    return NextResponse.json(
      { error: "Unable to delete block" },
      { status: 500 },
    );
  }
}
