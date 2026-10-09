import { Logger, pruneLogs } from "@/lib/logger";
import { recordOpsError, recordOpsOk } from "@/lib/ops-status";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const log = new Logger("cron");

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
    const logFilesPruned = await pruneLogs();
    await recordOpsOk("cron");
    log.info("Daily jobs finished", { log_files_pruned: logFilesPruned });
    return NextResponse.json({ ok: true, logFilesPruned });
  } catch (error) {
    log.error("Daily jobs failed", { error: error instanceof Error ? error.message : String(error) });
    await recordOpsError("cron", "Daily jobs failed");
    return NextResponse.json({ error: "Daily jobs failed" }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
