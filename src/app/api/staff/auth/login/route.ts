import { Logger } from "@/lib/logger";
import { verifyStaffCredentials } from "@/lib/staff-accounts";
import { isStaffAuthEnabled, createStaffSessionToken, withStaffSessionCookie } from "@/lib/staff-session";
import { clientIp, sharedLimiter, tooManyRequests } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";

const log = new Logger("auth");

/** Wrong PINs per IP and per staff name before a 15-minute lockout. */
const LOGIN_LIMIT = { limit: 8, windowMs: 15 * 60_000 };

const loginSchema = z.object({
  name: z.string().min(1).max(120),
  pin: z.string().min(4).max(6),
});

export async function POST(request: Request) {
  if (!isStaffAuthEnabled()) {
    return NextResponse.json(
      { error: "Staff login is not enabled" },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid login", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // PINs are short: count wrong tries per IP and per name across all instances,
    // and stop checking once either is used up, so a PIN can't be guessed.
    const byIp = sharedLimiter(`login-ip:${clientIp(request)}`, LOGIN_LIMIT);
    const byName = sharedLimiter(`login-name:${parsed.data.name.trim().toLowerCase()}`, LOGIN_LIMIT);
    if ((await byIp.blocked()) || (await byName.blocked())) {
      log.warning("Staff login locked out", { ip: clientIp(request), name: parsed.data.name });
      return tooManyRequests(LOGIN_LIMIT.windowMs, "Too many wrong tries. Please wait 15 minutes or ask a manager.");
    }

    const account = await verifyStaffCredentials(parsed.data.name, parsed.data.pin);
    if (!account) {
      await Promise.all([byIp.fail(), byName.fail()]);
      log.info("Staff login wrong PIN", { ip: clientIp(request), name: parsed.data.name });
      return NextResponse.json({ error: "Invalid name or PIN" }, { status: 401 });
    }

    const token = createStaffSessionToken({
      accountId: account.id,
      name: account.name,
      role: account.role,
    });

    return withStaffSessionCookie(
      NextResponse.json({
        ok: true,
        account: { id: account.id, name: account.name, role: account.role },
      }),
      token,
    );
  } catch (error) {
    log.error("Staff login failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Unable to log in" }, { status: 500 });
  }
}
