import { getHousekeepingTasks, saveHousekeepingTasks } from "@/lib/housekeeping/tasks";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["cleaner_head", "manager"]);
  if (!access.ok) return access.response;
  return NextResponse.json({ ok: true, tasks: await getHousekeepingTasks() });
}

export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  try {
    const body = (await request.json().catch(() => null)) as { tasks?: unknown } | null;
    return NextResponse.json({ ok: true, tasks: await saveHousekeepingTasks({ tasks: body?.tasks }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid tasks" }, { status: 400 });
  }
}
