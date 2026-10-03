/**
 * Signed "manage your booking" links (Sirvoy guest portal equivalent).
 *
 * The token is an HMAC of the reservation id, so a guest can open only the
 * booking they were emailed — reservation ids alone are never enough.
 * Secret: BOOKING_LINK_SECRET, else STAFF_SESSION_SECRET / PAYSTACK_SECRET_KEY
 * (already server-only secrets), else a fixed dev value outside production.
 */

import { getServerConfig } from "@/lib/config";
import { createHmac, timingSafeEqual } from "node:crypto";

function linkSecret(): string {
  const secret =
    process.env.BOOKING_LINK_SECRET?.trim() ||
    process.env.STAFF_SESSION_SECRET?.trim() ||
    process.env.PAYSTACK_SECRET_KEY?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
    throw new Error("BOOKING_LINK_SECRET is not configured");
  }
  return "relief-dev-booking-links";
}

export function signReservationId(reservationId: string): string {
  return createHmac("sha256", linkSecret())
    .update(`manage-booking:${reservationId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function isValidManageToken(
  reservationId: string,
  token: string | null | undefined,
): boolean {
  if (!token) return false;
  const expected = Buffer.from(signReservationId(reservationId));
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Absolute URL for emails; null when no signing secret is available. */
export function buildManageBookingUrl(reservationId: string): string | null {
  try {
    const token = signReservationId(reservationId);
    const qs = new URLSearchParams({ id: reservationId, t: token });
    return `${getServerConfig().appUrl}/booking/manage?${qs}`;
  } catch {
    return null;
  }
}

/** Guest link to one issued invoice; signed separately from the booking link. */
export function signInvoiceId(invoiceId: string): string {
  return createHmac("sha256", linkSecret())
    .update(`invoice:${invoiceId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function isValidInvoiceToken(invoiceId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(signInvoiceId(invoiceId));
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function buildInvoiceUrl(invoiceId: string): string | null {
  try {
    const qs = new URLSearchParams({ id: invoiceId, t: signInvoiceId(invoiceId) });
    return `${getServerConfig().appUrl}/booking/invoice?${qs}`;
  } catch {
    return null;
  }
}
