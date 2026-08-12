/**
 * Server-side enforcement point for `/api/staff/*` (and staff-only
 * `/api/demo/*`) routes — Agent O.
 *
 * Before this, `src/lib/staff-roles.ts` only filtered client-side nav; any
 * holder of the one shared `DEMO_DASHBOARD_KEY` could reach every route
 * regardless of role. This is the actual gate.
 *
 * `STAFF_AUTH_ENABLED=false` (default) keeps the legacy dashboard-key
 * behavior — any valid key grants access, role-blind — so nothing breaks
 * before staff accounts are seeded. Flip it on once they are (see ADR-007).
 */

import { isValidDashboardKey, unauthorizedDashboardResponse } from "@/lib/dashboard-auth";
import { isStaffAuthEnabled, getStaffSessionFromRequest, type StaffSessionPayload } from "@/lib/staff-session";
import type { StaffRole } from "@/lib/staff-roles";
import { NextResponse } from "next/server";

export type StaffAccessResult =
  | { ok: true; session: StaffSessionPayload | null }
  | { ok: false; response: NextResponse };

/**
 * `allowedRoles` is ignored while `STAFF_AUTH_ENABLED=false` (legacy mode
 * has no concept of role). Once auth is enabled, an empty/omitted
 * `allowedRoles` means "any authenticated staff member."
 */
export async function requireStaffAccess(
  request: Request,
  allowedRoles?: StaffRole[],
): Promise<StaffAccessResult> {
  if (!isStaffAuthEnabled()) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") ?? request.headers.get("x-demo-key");
    if (!isValidDashboardKey(key)) {
      return { ok: false, response: unauthorizedDashboardResponse() };
    }
    return { ok: true, session: null };
  }

  const session = getStaffSessionFromRequest(request);
  if (!session) {
    return { ok: false, response: unauthorizedDashboardResponse() };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden — your role cannot access this" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, session };
}
