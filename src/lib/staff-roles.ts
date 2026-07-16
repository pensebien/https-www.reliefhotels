/**
 * Role-based access control for the staff shell nav.
 *
 * This module is intentionally UI-agnostic: it only knows about roles,
 * nav items, and which role can reach which `/staff/*` href. Feature
 * teams (cashier, F&B, calendar, accounting) own what actually renders
 * at each href.
 */

export type StaffRole = "front_desk" | "manager" | "accountant";

export const STAFF_ROLES: StaffRole[] = ["front_desk", "manager", "accountant"];

export const DEFAULT_STAFF_ROLE: StaffRole = "front_desk";

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
  { href: "/staff/cashier", labelKey: "cashier" },
  { href: "/staff/fnb", labelKey: "fnb" },
  { href: "/staff/calendar", labelKey: "calendar" },
  { href: "/staff/accounting", labelKey: "accounting" },
];

/**
 * Per-role map of href -> access level. Absence of a key means the role
 * cannot reach that href at all (it is hidden from nav and should be
 * treated as unauthorized by any page-level guard).
 */
const ACCESS_MATRIX: Record<StaffRole, Partial<Record<string, StaffAccessLevel>>> = {
  front_desk: {
    "/staff": "full",
    "/staff/cashier": "full",
    "/staff/fnb": "full",
    "/staff/calendar": "full",
  },
  manager: {
    "/staff": "full",
    "/staff/cashier": "full",
    "/staff/fnb": "full",
    "/staff/calendar": "full",
    "/staff/accounting": "full",
  },
  accountant: {
    "/staff": "full",
    "/staff/accounting": "full",
    "/staff/calendar": "read",
  },
};

export function getAccessLevel(role: StaffRole, href: string): StaffAccessLevel | null {
  return ACCESS_MATRIX[role][href] ?? null;
}

export function canAccess(role: StaffRole, href: string): boolean {
  return getAccessLevel(role, href) !== null;
}

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return value === "front_desk" || value === "manager" || value === "accountant";
}

export function parseStaffRole(value: string | null | undefined): StaffRole {
  return isStaffRole(value) ? value : DEFAULT_STAFF_ROLE;
}

export function getAccessibleNavItems(role: StaffRole): StaffNavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(role, item.href));
}
