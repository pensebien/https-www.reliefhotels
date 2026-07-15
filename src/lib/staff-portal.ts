export const DEFAULT_STAFF_PORTAL_HOST = "reservation.reliefhotelsandsuites.com";

export const STAFF_PORTAL_HEADER = "x-staff-portal";

export function getStaffPortalHosts(): string[] {
  const raw = process.env.STAFF_PORTAL_HOST ?? DEFAULT_STAFF_PORTAL_HOST;
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeHost(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

export function isStaffPortalHost(host: string): boolean {
  const bare = normalizeHost(host);
  return getStaffPortalHosts().some((h) => bare === h || bare === `www.${h}`);
}

const STAFF_PATH =
  /^\/(en|fr|pcm|ig|yo)\/staff(\/|$)/;

export function isStaffPortalPath(pathname: string): boolean {
  return STAFF_PATH.test(pathname);
}

export function getStaffPortalPublicUrl(): string {
  const host = getStaffPortalHosts()[0] ?? DEFAULT_STAFF_PORTAL_HOST;
  return `https://${host}`;
}
