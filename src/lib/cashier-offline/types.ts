/**
 * Types for the cashier offline settle outbox (ADR-005, Phase J).
 *
 * Mirrors the `POST /api/staff/cashier/settle` contract owned by Agent H
 * (`docs/contracts/api-v1.md`). This module does not import from
 * `src/lib/cashier/**` — it only re-declares the wire shape it needs so this
 * package stays self-contained ahead of Agent H's merge.
 */

/**
 * Payment methods accepted by the settle endpoint.
 *
 * Only `cash` is safe to enqueue while offline — it requires no live
 * handshake with a terminal/provider. `paystack_terminal`,
 * `moniepoint_terminal`, and `moniepoint_transfer` all need an active network
 * connection to initiate a provider-side request, so queuing them for a
 * later, unattended flush would settle a stale amount against a terminal
 * session that no longer exists. Callers may still pass a non-cash method to
 * {@link enqueueSettle} with `{ allowNonCash: true }`, acknowledging that the
 * queued item can only be flushed once back online and may fail server-side
 * if the terminal session expired.
 */
export type CashierPaymentMethod =
  | "cash"
  | "paystack_terminal"
  | "moniepoint_terminal"
  | "moniepoint_transfer";

/** Payment methods that are safe to enqueue without a network connection. */
export const OFFLINE_SAFE_PAYMENT_METHODS: readonly CashierPaymentMethod[] = [
  "cash",
];

export type OutboxStatus = "pending" | "synced" | "failed";

/**
 * A queued settle request, keyed by `clientMutationId` so re-enqueueing the
 * same mutation (e.g. after a page reload) never creates a duplicate row.
 */
export interface OutboxItem {
  /** Primary key — always equal to `clientMutationId`. */
  id: string;
  reservationId: string;
  amountNgn: number;
  paymentMethod: CashierPaymentMethod;
  clientMutationId: string;
  /** Optional free-text note, forwarded to the settle endpoint. */
  note?: string;
  createdAt: string;
  status: OutboxStatus;
  /** Number of flush attempts made so far. */
  attempts: number;
  lastError?: string | null;
  lastAttemptAt?: string | null;
  syncedAt?: string | null;
}

/** Input accepted by {@link enqueueSettle}; server/queue fields are derived. */
export interface EnqueueSettleInput {
  reservationId: string;
  amountNgn: number;
  paymentMethod: CashierPaymentMethod;
  /** Idempotency key. Generated with `crypto.randomUUID()` if omitted. */
  clientMutationId?: string;
  note?: string;
}

export const CASHIER_OFFLINE_DB_NAME = "relief-cashier-offline";
export const CASHIER_OFFLINE_DB_VERSION = 1;
export const SETTLE_OUTBOX_STORE = "settle_outbox";

/** The settle response shape returned by `POST /api/staff/cashier/settle`. */
export interface SettleResponseBody {
  ok: boolean;
  paymentId?: string;
  reference?: string;
  status?: "success" | "pending";
  provider?: string;
  demo?: boolean;
  error?: string;
}
