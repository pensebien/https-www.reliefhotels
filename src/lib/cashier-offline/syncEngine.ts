/**
 * Flushes the settle outbox against `POST /api/staff/cashier/settle`
 * (Agent H's contract — `docs/contracts/api-v1.md`).
 *
 * `fetchImpl` is always passed in explicitly (rather than closing over the
 * global `fetch`) so this module has no implicit browser/runtime dependency
 * and is trivial to unit test with a stub.
 */
import { getById, listPending, markAttempted, markFailed, markSynced } from "./outbox";
import type { OutboxItem, SettleResponseBody } from "./types";

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export interface FlushOutboxOptions {
  /** Settle endpoint path. Defaults to `/api/staff/cashier/settle`. */
  endpoint?: string;
  /** Demo-dashboard key required by the settle route (ADR-005 key gate). */
  key?: string;
  /** Header used to send `key`. Defaults to `x-demo-key`. */
  keyHeader?: string;
}

export interface FlushOutboxResult {
  synced: string[];
  failed: string[];
  /** Left pending because of a network error — safe to retry later. */
  skipped: string[];
}

const DEFAULT_ENDPOINT = "/api/staff/cashier/settle";
const DEFAULT_KEY_HEADER = "x-demo-key";

/**
 * Sends one queued item to the settle endpoint and updates its outbox status.
 * Exported for callers (e.g. a "retry this one" UI action) that want to
 * flush a single item outside the batch loop.
 */
export async function flushOutboxItem(
  item: OutboxItem,
  fetchImpl: FetchLike,
  options: FlushOutboxOptions = {},
): Promise<"synced" | "failed" | "skipped"> {
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const keyHeader = options.keyHeader ?? DEFAULT_KEY_HEADER;

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.key) headers[keyHeader] = options.key;

  let res: { ok: boolean; status: number; json: () => Promise<unknown> };
  try {
    res = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        reservationId: item.reservationId,
        amountNgn: item.amountNgn,
        paymentMethod: item.paymentMethod,
        clientMutationId: item.clientMutationId,
        note: item.note,
      }),
    });
  } catch (error) {
    // Network error (offline, DNS failure, aborted, etc.) — leave pending
    // for the next flush rather than treating it as a hard failure.
    await markAttempted(item.id, error instanceof Error ? error.message : "Network error");
    return "skipped";
  }

  // 409 from this endpoint means "already settled for this clientMutationId"
  // — an idempotent success, not a conflict to surface to the cashier.
  if (res.ok || res.status === 409) {
    await markSynced(item.id);
    return "synced";
  }

  let message = `Settle failed with status ${res.status}`;
  try {
    const body = (await res.json()) as SettleResponseBody;
    if (body?.error) message = body.error;
  } catch {
    // response body wasn't JSON — fall back to the status-based message
  }
  await markFailed(item.id, message);
  return "failed";
}

/**
 * Flushes every pending outbox item, in FIFO (`createdAt`) order, stopping
 * neither on individual failures nor network errors — each item is
 * attempted exactly once per call so a single stuck item can't block the
 * rest of the queue.
 */
export async function flushOutbox(
  fetchImpl: FetchLike,
  options: FlushOutboxOptions = {},
): Promise<FlushOutboxResult> {
  const result: FlushOutboxResult = { synced: [], failed: [], skipped: [] };
  const pending = await listPending();

  for (const item of pending) {
    const outcome = await flushOutboxItem(item, fetchImpl, options);
    result[outcome].push(item.id);
  }

  return result;
}

/** Re-flushes a single previously-failed or pending item by its id. */
export async function retryOutboxItem(
  id: string,
  fetchImpl: FetchLike,
  options: FlushOutboxOptions = {},
): Promise<"synced" | "failed" | "skipped" | "not_found"> {
  const item = await getById(id);
  if (!item) return "not_found";
  return flushOutboxItem(item, fetchImpl, options);
}
