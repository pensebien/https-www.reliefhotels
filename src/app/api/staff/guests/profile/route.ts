import { saveProfileEdits } from "@/lib/guests/profiles";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

/** Save a guest's tags, company, notes and blocked flag (manager). */
export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = z.string().email().safeParse(body?.email);
  if (!email.success) return NextResponse.json({ error: "Missing guest email" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, profile: await saveProfileEdits(email.data, body) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid profile" }, { status: 400 });
  }
}
