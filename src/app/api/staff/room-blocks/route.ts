import { addRoomBlock, listRoomBlocks } from "@/lib/db/inventory-store";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { z } from "zod";
import { NextResponse } from "next/server";

const createBlockSchema = z.object({
  roomId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional(),
});

export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["cleaner_head", "manager"]);
  if (!access.ok) return access.response;

  try {
    const blocks = await listRoomBlocks();
    return NextResponse.json({ ok: true, blocks });
  } catch (error) {
    console.error("[staff/room-blocks GET]", error);
    return NextResponse.json(
      { error: "Unable to load room blocks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["cleaner_head", "manager"]);
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const parsed = createBlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid block", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const block = await addRoomBlock(parsed.data);
    return NextResponse.json({ ok: true, block });
  } catch (error) {
    console.error("[staff/room-blocks POST]", error);
    const message = error instanceof Error ? error.message : "Unable to create block";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
