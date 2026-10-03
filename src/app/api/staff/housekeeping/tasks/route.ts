import { setTaskDone } from "@/lib/housekeeping/store";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  unitId: z.string().min(1).max(100),
  taskId: z.string().min(1).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  done: z.boolean(),
});

/** Tick (or untick) a housekeeping task for a room on a day. */
export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["cleaner_head", "manager"]);
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid task update" }, { status: 400 });
  const { done, ...entry } = parsed.data;
  await setTaskDone({ ...entry, doneBy: access.session?.name }, done);
  return NextResponse.json({ ok: true });
}
