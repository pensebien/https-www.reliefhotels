import { getCheckinSettings } from "@/lib/checkin/settings";
import { purgeExpiredIdData } from "@/lib/checkin/store";
import { runGuestMessages } from "@/lib/guest-messages/run";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Daily jobs, called by the Netlify scheduled function
 * (netlify/functions/daily-jobs.mts) with `Authorization: Bearer CRON_SECRET`.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const given = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const guestMessages = await runGuestMessages();
    // Delete guest ID numbers and photos once the retention period is over.
    const idRecordsPurged = await purgeExpiredIdData((await getCheckinSettings()).retentionDays);
    return NextResponse.json({ ok: true, guestMessages, idRecordsPurged });
  } catch (error) {
    console.error("[cron/daily]", error);
    return NextResponse.json({ error: "Daily jobs failed" }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
