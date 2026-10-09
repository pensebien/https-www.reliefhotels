/**
 * Rate limits. Two kinds:
 * - memory: per server instance, cheap; for guest endpoints (stops floods).
 * - shared: counted in Supabase (rate_limit_hit), so it holds across every
 *   serverless instance; for guessing attacks (staff PINs, dashboard key).
 *   Falls back to memory in file mode or if the database call fails.
 */

import { Logger } from "@/lib/logger";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { NextResponse } from "next/server";

const log = new Logger("auth");

type Window = { start: number; count: number };
const windows = new Map<string, Window>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, w] of windows) if (now - w.start > 3_600_000) windows.delete(key);
}

/** Count in the current window after an optional hit. */
function memoryCount(key: string, windowMs: number, increment: boolean): number {
  const now = Date.now();
  sweep(now);
  let w = windows.get(key);
  if (!w || now - w.start >= windowMs) {
    if (!increment) return 0;
    w = { start: now, count: 0 };
    windows.set(key, w);
  }
  if (increment) w.count++;
  return w.count;
}

async function sharedCount(key: string, windowMs: number, increment: boolean): Promise<number> {
  const supabase = isSupabaseEnabled() ? getSupabaseAdmin() : null;
  if (supabase) {
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_key: key,
      p_window_seconds: Math.ceil(windowMs / 1000),
      p_increment: increment,
    });
    if (!error && typeof data === "number") return data;
    // Migration 024 missing or a blip: still limit, per instance.
    log.warning("Shared rate-limit counter unavailable, limiting per instance", { key, error: error?.message });
  }
  return memoryCount(key, windowMs, increment);
}

export type Limit = { limit: number; windowMs: number };

/** The unit-test runner turns limits off (tests make many requests from one address). */
const disabled = () => process.env.RATE_LIMIT_DISABLED === "true";

/** The caller's IP as Netlify / proxies report it. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-nf-client-connection-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function tooManyRequests(windowMs: number, message = "Too many requests. Please wait a moment and try again."): NextResponse {
  return NextResponse.json(
    { error: message, code: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } },
  );
}

/** Counts this request; true when it is over the limit. */
export function overMemoryLimit(key: string, { limit, windowMs }: Limit): boolean {
  if (disabled()) return false;
  return memoryCount(key, windowMs, true) > limit;
}

/** For guessing attacks: check before trying, count only failures. */
export const sharedLimiter = (key: string, { limit, windowMs }: Limit) => ({
  blocked: async () => !disabled() && (await sharedCount(key, windowMs, false)) >= limit,
  fail: async () => {
    if (!disabled()) await sharedCount(key, windowMs, true);
  },
});

export const MAX_JSON_BYTES = 32 * 1024;

/**
 * Guard for public POST endpoints: refuses oversized bodies (413) and more
 * than `limit` requests per IP per window (429). Returns a response to send,
 * or null to carry on.
 */
export function guardPublicPost(request: Request, bucket: string, rate: Limit, maxBytes = MAX_JSON_BYTES): NextResponse | null {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) {
    return NextResponse.json({ error: "Request is too large", code: "too_large" }, { status: 413 });
  }
  if (overMemoryLimit(`${bucket}:${clientIp(request)}`, rate)) return tooManyRequests(rate.windowMs);
  return null;
}

/** Test seam. */
export function resetRateLimits(): void {
  windows.clear();
}
