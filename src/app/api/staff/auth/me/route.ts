import { isStaffAuthEnabled, getStaffSessionFromRequest } from "@/lib/staff-session";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!isStaffAuthEnabled()) {
    return NextResponse.json({ enabled: false });
  }

  const session = getStaffSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ enabled: true, authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    enabled: true,
    authenticated: true,
    name: session.name,
    role: session.role,
  });
}
