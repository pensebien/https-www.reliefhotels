import { getCheckinSettings, saveCheckinSettings } from "@/lib/checkin/settings";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  return NextResponse.json({ ok: true, settings: await getCheckinSettings() });
}

export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  try {
    return NextResponse.json({ ok: true, settings: await saveCheckinSettings(await request.json()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid settings" }, { status: 400 });
  }
}
