/**
 * Signed "confirm this transfer" links sent to the front-desk WhatsApp.
 *
 * Same HMAC scheme as the guest manage-booking link, but a different purpose
 * prefix, so a guest's manage link can never confirm a payment (and vice
 * versa). Opening the link only shows the booking; confirming is a POST.
 */

import { getServerConfig } from "@/lib/config";
import { linkSecret } from "@/lib/booking-engine/manage-link";
import { createHmac, timingSafeEqual } from "node:crypto";

export function signConfirmToken(reservationId: string): string {
  return createHmac("sha256", linkSecret())
    .update(`confirm-transfer:${reservationId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function isValidConfirmToken(reservationId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(signConfirmToken(reservationId));
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Absolute URL for the desk's WhatsApp alert; null when no signing secret is available. */
export function buildConfirmPaymentUrl(reservationId: string): string | null {
  try {
    const qs = new URLSearchParams({ id: reservationId, t: signConfirmToken(reservationId) });
    return `${getServerConfig().appUrl}/confirm-payment?${qs}`;
  } catch {
    return null;
  }
}
