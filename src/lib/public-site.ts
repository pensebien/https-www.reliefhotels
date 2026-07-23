import { isStaffPortalHost, normalizeHost } from "@/lib/staff-portal";

/** Canonical guest origin (www). Keep apex as a redirect target only. */
export const DEFAULT_PUBLIC_SITE_ORIGIN =
  "https://www.reliefhotelsandsuites.com";

export function getPublicSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_PUBLIC_SITE_ORIGIN
  ).replace(/\/$/, "");
}

/**
 * If the request Host is the apex twin of the canonical www (or vice versa
 * when APP_URL is apex), return the canonical host to redirect to.
 * Skips localhost, Netlify preview hosts, and the staff portal host.
 */
export function canonicalHostRedirectTarget(
  hostHeader: string,
): string | null {
  const host = normalizeHost(hostHeader);
  if (!host) return null;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".netlify.app") ||
    host.endsWith(".local")
  ) {
    return null;
  }
  if (isStaffPortalHost(host)) return null;

  let canonicalHost: string;
  try {
    canonicalHost = new URL(getPublicSiteOrigin()).host.toLowerCase();
  } catch {
    canonicalHost = new URL(DEFAULT_PUBLIC_SITE_ORIGIN).host;
  }

  if (host === canonicalHost) return null;

  const apexOf = (h: string) => h.replace(/^www\./, "");
  if (apexOf(host) !== apexOf(canonicalHost)) return null;

  return canonicalHost;
}
