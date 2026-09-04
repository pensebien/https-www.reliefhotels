/**
 * Signed, single-purpose tokens for the emailed "approve this bank transfer"
 * link (manual bank-transfer payment method).
 *
 * Deliberately its own module with its own secret (`BANK_TRANSFER_LINK_SECRET`),
 * not a generalization of `staff-session.ts` — a bug in one token type should
 * never be able to forge the other. Mechanics (base64url(payload) + "." +
 * HMAC-SHA256 signature, `timingSafeEqual` compare, `exp` check) are cloned
 * from that module on purpose.
 *
 * The payload only ever carries `{ reference, exp }` — it must never be
 * trusted as a data source. The route that verifies a token re-fetches the
 * live PaymentRecord by `reference` and re-checks its current amount/status
 * before approving anything; the token only proves "this link was
 * legitimately issued for this reference."
 */

import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000; // 48h — long enough for a manager to see the email

export type BankTransferApprovalPayload = {
  reference: string;
  exp: number;
};

function linkSecret(): string | undefined {
  return process.env.BANK_TRANSFER_LINK_SECRET?.trim() || undefined;
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function createBankTransferApprovalToken(
  reference: string,
  ttlMs: number = DEFAULT_TTL_MS,
): string | null {
  const secret = linkSecret();
  if (!secret) return null;

  const payload: BankTransferApprovalPayload = {
    reference,
    exp: Date.now() + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyBankTransferApprovalToken(
  token: string | undefined | null,
): BankTransferApprovalPayload | null {
  const secret = linkSecret();
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
    ) as BankTransferApprovalPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.reference !== "string" || !payload.reference) return null;
    return payload;
  } catch {
    return null;
  }
}
