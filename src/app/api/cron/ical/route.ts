import { syncChannelFeeds } from "@/lib/channels/feeds";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Pull OTA calendar feeds into room blocks; Netlify runs it every 30 minutes. */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, feeds: await syncChannelFeeds() });
}

export const POST = handle;
export const GET = handle;
