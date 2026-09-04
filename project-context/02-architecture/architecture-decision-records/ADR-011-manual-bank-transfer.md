# ADR-011: Manual bank transfer — accepted trust-model tradeoff

**Date:** 2026-09-03
**Status:** Accepted
**Deciders:** Tech Lead
**Traces to:** `src/lib/bank-transfer.ts`, `src/lib/bank-transfer-link.ts`, ADR-005 (cashier dual POS)

## Context

Guests can currently pay a deposit via Paystack (online), Moniepoint terminal/transfer, or Cash —
every one of those either goes through a payment gateway or is collected in person by staff. Some
guests instead want to pay by direct bank transfer arranged over WhatsApp: staff share the hotel's
bank account in chat, the guest transfers, and — since there is no gateway, no webhook, nothing
that verifies the money actually moved — a human has to attest that it happened before the room
reserves.

This is a materially weaker guarantee than every other payment method on the site. The decision
here is to accept that weaker guarantee for this one, explicitly opt-in method, rather than refuse
to build it — while keeping the *approval* step itself as secure as that trust model allows.

## Decision

1. New payment method `bank_transfer_manual`, alongside the existing four. No payment gateway is
   ever contacted for it — `src/lib/cashier/providers.ts`'s provider for this method and the
   equivalent branch in `src/app/api/demo/reservations/route.ts` only record the payment as
   `pending` and fire an approval request; nothing marks it `success` except a human action.
2. Approval happens through the exact same `manuallyConfirmPendingPayment()` →
   `confirmMoniepointPayment()` → `handlePaymentConfirmed()` chain every other manual-confirm
   method already uses (Card/Transfer with no terminal) — no new "mark it paid" logic, no separate
   code path that could drift from the existing one.
3. Two ways to approve: the staff dashboard's existing "Confirm payment received" button (works
   for free once the method is in `MANUALLY_CONFIRMABLE_METHODS`), or a signed, single-purpose,
   short-TTL emailed link (`src/lib/bank-transfer-link.ts`) sent to a fixed, trusted,
   never-guest-supplied address (`BANK_TRANSFER_APPROVAL_EMAIL`).
4. The emailed link is a safe GET (decode-and-display only) plus a separate POST that requires
   *both* the token and an authenticated staff session/key (`requireStaffAccess`) — a
   leaked/forwarded link alone cannot approve anything. The POST re-validates the live payment
   record rather than trusting the token's contents.
5. A dedicated `BANK_TRANSFER_LINK_SECRET`, separate from `STAFF_SESSION_SECRET`, so a leak of one
   secret can't be used against the other token type.
6. New `LedgerChannel` value (`bank_transfer_manual`) so this money is visible on its own line in
   `/staff/accounting` rather than silently miscounting as Paystack revenue — this method has no
   automated reconciliation against a real bank statement (unlike ADR-010's Paystack
   reconciliation), so it needs to stand out as "manually attested" in the ledger.

## Options considered

| Option | Pros | Cons | Result |
|--------|------|------|--------|
| Don't build it — Paystack/Moniepoint cover card payments already | No new trust-model risk | Some guests genuinely prefer/need direct bank transfer (corporate wires, diaspora guests, no compatible card) | Rejected — real demand, and the risk is manageable if the *approval* step is built carefully |
| Auto-confirm on guest's say-so (guest clicks "I've paid") | Fastest guest experience | Anyone could claim payment and get a free room — no verification at all | Rejected outright |
| Bare mutating email link (click = approved, no auth) | Simplest to build | Mail-client/security-gateway link prefetching would silently approve real reservations before a human ever saw the email; a forwarded link approves for anyone | Rejected |
| Safe GET + authenticated POST (this ADR) | Defeats prefetch-triggered approval; a leaked link alone can't approve; reuses all existing manual-confirm infrastructure | Slightly more moving parts than a bare link | **Accepted** |

## Consequences

**Positive:** guests who want to pay by direct bank transfer have a path to do so, without opening
a gateway-bypass hole an attacker could exploit — approval genuinely requires a human with staff
access, not just possession of an email.

**Negative:** this method is only as trustworthy as the manager's own diligence in checking their
bank app before approving — nothing in the system can catch a manager who approves without really
checking. Reconciliation against the real bank statement is manual, not automated (contrast
ADR-010's Paystack reconciliation), so drift here won't be caught unless someone looks.

**Mitigation:** the ledger surfaces this channel separately and explicitly (not blended into
Paystack or Moniepoint totals) so it's visible as a distinct, lower-confidence revenue line for
whoever reviews the books.

## Success criteria

- A `bank_transfer_manual` payment sits `pending` with no gateway ever contacted.
- The dashboard "Confirm payment received" button and the emailed link both converge on the same
  confirm chain and produce an identical end state (payment `success`, reservation `confirmed`,
  guest receipt sent, RAYZA synced).
- A GET on the approval link never changes payment/reservation status, under any circumstances.
- A POST with a valid token but no staff auth is rejected (401/403).
- A replayed/already-used link is rejected (`not_pending`).
- `/staff/accounting` shows this channel's total on its own line, not folded into Paystack.

## Rollback

Remove `"bank_transfer_manual"` from the payment-method UI selectors (staff walk-in dialog,
cashier settle panel) so staff can no longer create new payments of this type. Existing
`bank_transfer_manual` payments already in the store are unaffected and can still be approved via
the dashboard button (the confirm chain itself is shared infrastructure, not specific to this
feature). No data migration needed either direction — `payment_method` is a plain `text` column.
