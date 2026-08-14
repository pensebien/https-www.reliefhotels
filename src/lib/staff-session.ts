/**
 * Staff session tokens (Agent O — real staff identity/RBAC).
 *
 * Hand-rolled HMAC-signed cookie, not a new auth vendor — consistent with
 * this project's prior rejection of Clerk on cost/scope grounds
 * (`technology-decisions.md`) and the plain-crypto style already used
 * elsewhere in this codebase (e.g. `paystack-auth.ts`).
 *
 * Deliberately avoids `next/headers`'s `cookies()` — it requires an actual
 * Next.js request-render scope and throws when a route handler is invoked
 * directly with a bare `Request` (this repo's own `tests/api/*.test.ts`
 * convention). Reading/writing cookies via the plain `Request`/`NextResponse`
 * objects works identically in real routes and in that test style.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { StaffRole } from "@/lib/staff-roles";

export const STAFF_SESSION_COOKIE = "relief_staff_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h — one shift

export type StaffSessionPayload = {
  accountId: string;
  name: string;
  role: StaffRole;
  exp: number;
};

function sessionSecret(): string | undefined {
  return process.env.STAFF_SESSION_SECRET?.trim() || undefined;
}

/** Feature flag — see ADR-007. Off by default so the legacy dashboard-key
 * gate keeps working until staff accounts are seeded and this is switched on. */
export function isStaffAuthEnabled(): boolean {
  return process.env.STAFF_AUTH_ENABLED === "true" && Boolean(sessionSecret());
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createStaffSessionToken(input: {
  accountId: string;
  name: string;
  role: StaffRole;
}): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("STAFF_SESSION_SECRET is not configured");

  const payload: StaffSessionPayload = { ...input, exp: Date.now() + SESSION_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyStaffSessionToken(
  token: string | undefined | null,
): StaffSessionPayload | null {
  const secret = sessionSecret();
  if (!token || !secret) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded, secret);
  const provided = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8"),
    ) as StaffSessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function getStaffSessionFromRequest(request: Request): StaffSessionPayload | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return verifyStaffSessionToken(cookies[STAFF_SESSION_COOKIE]);
}

export function withStaffSessionCookie(
  response: NextResponse,
  token: string,
): NextResponse {
  response.cookies.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return response;
}

export function withClearedStaffSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(STAFF_SESSION_COOKIE);
  return response;
}
