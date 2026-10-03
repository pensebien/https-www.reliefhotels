import { syncChannelFeeds } from "@/lib/channels/feeds";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

/** "Sync now" from the Channels page. */
export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  return NextResponse.json({ ok: true, status: await syncChannelFeeds() });
}
