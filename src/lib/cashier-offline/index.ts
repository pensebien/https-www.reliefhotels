/**
 * Cashier offline outbox — public API (ADR-005, Phase J).
 *
 * Owned exclusively by Agent J. UI wiring (Agent I) and the settle API
 * (Agent H) consume this package but must not edit files under
 * `src/lib/cashier-offline/**`.
 */
export type {
  CashierPaymentMethod,
  EnqueueSettleInput,
  OutboxItem,
  OutboxStatus,
  SettleResponseBody,
} from "./types";
export {
  CASHIER_OFFLINE_DB_NAME,
  CASHIER_OFFLINE_DB_VERSION,
  OFFLINE_SAFE_PAYMENT_METHODS,
  SETTLE_OUTBOX_STORE,
} from "./types";

export {
  supportsIndexedDB,
  getAllOutboxItems,
  getOutboxItem,
  putOutboxItem,
  deleteOutboxItem,
  clearOutboxStoreForTests,
} from "./storage";

export {
  OfflineOutboxError,
  enqueueSettle,
  listAll,
  listPending,
  listFailed,
  getById,
  markSynced,
  markFailed,
  markAttempted,
  removeItem,
} from "./outbox";
export type { EnqueueSettleOptions } from "./outbox";

export {
  flushOutbox,
  flushOutboxItem,
  retryOutboxItem,
} from "./syncEngine";
export type { FetchLike, FlushOutboxOptions, FlushOutboxResult } from "./syncEngine";

export { isOnline, subscribeOnline, subscribeOffline } from "./network";
