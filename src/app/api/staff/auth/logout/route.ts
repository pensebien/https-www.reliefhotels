import { withClearedStaffSessionCookie } from "@/lib/staff-session";
import { NextResponse } from "next/server";

export async function POST() {
  return withClearedStaffSessionCookie(NextResponse.json({ ok: true }));
}
