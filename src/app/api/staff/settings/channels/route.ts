import { rooms } from "@/content/site";
import { buildFeedUrl } from "@/lib/booking-engine/manage-link";
import { getChannelFeeds, getFeedStatus, saveChannelFeeds } from "@/lib/channels/feeds";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const [feeds, status] = await Promise.all([getChannelFeeds(), getFeedStatus()]);
  return NextResponse.json({
    ok: true,
    feeds,
    status,
    exports: rooms.map((r) => ({ roomId: r.id, url: buildFeedUrl(r.id) })),
    scheduled: Boolean(process.env.CRON_SECRET?.trim()),
  });
}

export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  try {
    const body = (await request.json().catch(() => null)) as { feeds?: unknown } | null;
    return NextResponse.json({ ok: true, feeds: await saveChannelFeeds({ feeds: body?.feeds }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid feeds" }, { status: 400 });
  }
}
