/**
 * IndexedDB-backed persistence for the settle outbox, with an in-memory
 * fallback so the rest of this package (and its unit tests) works in
 * environments without `indexedDB` — Node/`node:test`, SSR, older browsers.
 *
 * Pattern follows CravinsOS (`~/projects/cravinsos/src/lib/offline/storage.ts`):
 * a single lazily-opened DB handle, one object store per queue, and a
 * feature-detected fallback path with the same public function signatures.
 */
import {
  CASHIER_OFFLINE_DB_NAME,
  CASHIER_OFFLINE_DB_VERSION,
  SETTLE_OUTBOX_STORE,
  type OutboxItem,
} from "./types";

let dbPromise: Promise<IDBDatabase> | null = null;

/** In-memory fallback store, keyed by `OutboxItem.id`. Used when IndexedDB is unavailable. */
const memoryStore = new Map<string, OutboxItem>();

export function supportsIndexedDB(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(
        CASHIER_OFFLINE_DB_NAME,
        CASHIER_OFFLINE_DB_VERSION,
      );
      req.onerror = () => {
        dbPromise = null;
        reject(req.error ?? new Error("IndexedDB open failed"));
      };
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SETTLE_OUTBOX_STORE)) {
          db.createObjectStore(SETTLE_OUTBOX_STORE, { keyPath: "id" });
        }
      };
    });
  }
  return dbPromise;
}

export async function getAllOutboxItems(): Promise<OutboxItem[]> {
  if (!supportsIndexedDB()) {
    return Array.from(memoryStore.values());
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTLE_OUTBOX_STORE, "readonly");
    const req = tx.objectStore(SETTLE_OUTBOX_STORE).getAll();
    req.onsuccess = () => resolve((req.result as OutboxItem[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function getOutboxItem(id: string): Promise<OutboxItem | null> {
  if (!supportsIndexedDB()) {
    return memoryStore.get(id) ?? null;
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTLE_OUTBOX_STORE, "readonly");
    const req = tx.objectStore(SETTLE_OUTBOX_STORE).get(id);
    req.onsuccess = () => resolve((req.result as OutboxItem | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function putOutboxItem(item: OutboxItem): Promise<void> {
  if (!supportsIndexedDB()) {
    memoryStore.set(item.id, item);
    return;
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTLE_OUTBOX_STORE, "readwrite");
    tx.objectStore(SETTLE_OUTBOX_STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteOutboxItem(id: string): Promise<void> {
  if (!supportsIndexedDB()) {
    memoryStore.delete(id);
    return;
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTLE_OUTBOX_STORE, "readwrite");
    tx.objectStore(SETTLE_OUTBOX_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Test-only helper: wipes the outbox store (both IndexedDB and memory fallback). */
export async function clearOutboxStoreForTests(): Promise<void> {
  memoryStore.clear();
  if (!supportsIndexedDB()) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTLE_OUTBOX_STORE, "readwrite");
    tx.objectStore(SETTLE_OUTBOX_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
