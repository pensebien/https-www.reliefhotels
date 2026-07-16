/**
 * Outbox CRUD operations for queued settle payments.
 *
 * Kept intentionally thin — no HTTP calls here. See `syncEngine.ts` for the
 * flush loop that actually talks to `POST /api/staff/cashier/settle`.
 */
import {
  deleteOutboxItem,
  getAllOutboxItems,
  getOutboxItem,
  putOutboxItem,
} from "./storage";
import {
  OFFLINE_SAFE_PAYMENT_METHODS,
  type EnqueueSettleInput,
  type OutboxItem,
} from "./types";

export class OfflineOutboxError extends Error {}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `settle-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface EnqueueSettleOptions {
  /**
   * Acknowledge that `paymentMethod` is not `cash` and therefore requires a
   * live network connection to actually settle once flushed. Without this
   * flag, {@link enqueueSettle} throws {@link OfflineOutboxError} for
   * non-cash methods so terminal-based flows fail fast instead of silently
   * queuing an entry that can't complete offline.
   */
  allowNonCash?: boolean;
}

/**
 * Queues a settle payload for later sync. Idempotent on `clientMutationId`:
 * calling this twice with the same `clientMutationId` updates (not
 * duplicates) the existing pending item, so retrying an enqueue after a
 * crash/reload is always safe.
 */
export async function enqueueSettle(
  input: EnqueueSettleInput,
  options: EnqueueSettleOptions = {},
): Promise<OutboxItem> {
  if (
    !OFFLINE_SAFE_PAYMENT_METHODS.includes(input.paymentMethod) &&
    !options.allowNonCash
  ) {
    throw new OfflineOutboxError(
      `paymentMethod "${input.paymentMethod}" needs a live network connection to settle ` +
        `(only ${OFFLINE_SAFE_PAYMENT_METHODS.join(", ")} can be queued offline). ` +
        `Pass { allowNonCash: true } to queue it anyway once you're back online.`,
    );
  }
  if (!(input.amountNgn > 0)) {
    throw new OfflineOutboxError("amountNgn must be a positive number");
  }

  const id = input.clientMutationId ?? randomId();
  const existing = await getOutboxItem(id);

  const item: OutboxItem = {
    id,
    reservationId: input.reservationId,
    amountNgn: input.amountNgn,
    paymentMethod: input.paymentMethod,
    clientMutationId: id,
    note: input.note,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    status: "pending",
    attempts: existing?.attempts ?? 0,
    lastError: null,
    lastAttemptAt: existing?.lastAttemptAt ?? null,
    syncedAt: null,
  };

  await putOutboxItem(item);
  return item;
}

export async function listAll(): Promise<OutboxItem[]> {
  const items = await getAllOutboxItems();
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listPending(): Promise<OutboxItem[]> {
  const items = await listAll();
  return items.filter((item) => item.status === "pending");
}

export async function listFailed(): Promise<OutboxItem[]> {
  const items = await listAll();
  return items.filter((item) => item.status === "failed");
}

export async function getById(id: string): Promise<OutboxItem | null> {
  return getOutboxItem(id);
}

export async function markSynced(id: string): Promise<OutboxItem | null> {
  const item = await getOutboxItem(id);
  if (!item) return null;
  const updated: OutboxItem = {
    ...item,
    status: "synced",
    lastError: null,
    syncedAt: new Date().toISOString(),
  };
  await putOutboxItem(updated);
  return updated;
}

export async function markFailed(
  id: string,
  error: string,
): Promise<OutboxItem | null> {
  const item = await getOutboxItem(id);
  if (!item) return null;
  const updated: OutboxItem = {
    ...item,
    status: "failed",
    attempts: item.attempts + 1,
    lastError: error,
    lastAttemptAt: new Date().toISOString(),
  };
  await putOutboxItem(updated);
  return updated;
}

/**
 * Marks a pending item as attempted-but-still-pending, e.g. after a network
 * error where it should be retried on the next flush rather than treated as
 * a hard failure.
 */
export async function markAttempted(
  id: string,
  error: string,
): Promise<OutboxItem | null> {
  const item = await getOutboxItem(id);
  if (!item) return null;
  const updated: OutboxItem = {
    ...item,
    status: "pending",
    attempts: item.attempts + 1,
    lastError: error,
    lastAttemptAt: new Date().toISOString(),
  };
  await putOutboxItem(updated);
  return updated;
}

/** Removes an item entirely (e.g. user cancels a queued cash settle). */
export async function removeItem(id: string): Promise<void> {
  await deleteOutboxItem(id);
}
