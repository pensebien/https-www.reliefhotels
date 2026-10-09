/**
 * Role-based access control for the staff shell nav.
 *
 * This module is intentionally UI-agnostic: it only knows about roles,
 * nav items, and which role can reach which `/staff/*` href.
 *
 * Note: this matrix used to be nav-filtering only (no server enforcement).
 * `src/lib/staff-auth-guard.ts` (Agent O) is the actual enforcement point —
 * every `/api/staff/*` route must call `requireStaffAccess()`, this matrix
 * alone does not protect anything.
 */

export type StaffRole = "cashier" | "manager" | "restaurant_owner" | "cleaner_head";

export const STAFF_ROLES: StaffRole[] = [
  "cashier",
  "manager",
  "restaurant_owner",
  "cleaner_head",
];

export const DEFAULT_STAFF_ROLE: StaffRole = "cashier";

/** Access level for a given role/href pair. "read" renders but is marked view-only. */
export type StaffAccessLevel = "full" | "read";

export interface StaffNavItem {
  /** Absolute, locale-agnostic pathname (matches next-intl's `usePathname()`). */
  href: string;
  /** Key into the `staffShell.nav` i18n namespace. */
  labelKey: string;
}

export const NAV_ITEMS: StaffNavItem[] = [
  { href: "/staff", labelKey: "dashboard" },
  { href: "/staff/rayza", labelKey: "rayza" },
];

/**
 * Per-role map of href -> access level. Absence of a key means the role
 * cannot reach that href at all (it is hidden from nav and is rejected by
 * `requireStaffAccess()` for the matching API routes). Hotel operations
 * (F&B, housekeeping, front desk) live in RAYZA, so the restaurant and
 * housekeeping roles only get a read-only view of online bookings.
 */
const ACCESS_MATRIX: Record<StaffRole, Partial<Record<string, StaffAccessLevel>>> = {
  cashier: { "/staff": "full" },
  manager: { "/staff": "full", "/staff/rayza": "full" },
  restaurant_owner: { "/staff": "read" },
  cleaner_head: { "/staff": "read" },
};

export function getAccessLevel(role: StaffRole, href: string): StaffAccessLevel | null {
  return ACCESS_MATRIX[role][href] ?? null;
}

export function canAccess(role: StaffRole, href: string): boolean {
  return getAccessLevel(role, href) !== null;
}

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return (
    value === "cashier" ||
    value === "manager" ||
    value === "restaurant_owner" ||
    value === "cleaner_head"
  );
}

export function parseStaffRole(value: string | null | undefined): StaffRole {
  return isStaffRole(value) ? value : DEFAULT_STAFF_ROLE;
}

export function getAccessibleNavItems(role: StaffRole): StaffNavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(role, item.href));
}
