/**
 * Minimal browser-online helpers. Kept separate from `syncEngine.ts` so UI
 * code (Agent I) can subscribe to connectivity changes without pulling in
 * the fetch/flush logic.
 */

/** Returns `true` when running outside a browser (SSR/tests) — fail open. */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * Subscribes to the browser `online` event. Returns an unsubscribe function.
 * No-ops (and returns a no-op unsubscribe) outside a browser environment.
 */
export function subscribeOnline(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", cb);
  return () => window.removeEventListener("online", cb);
}

/** Subscribes to the browser `offline` event. Returns an unsubscribe function. */
export function subscribeOffline(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("offline", cb);
  return () => window.removeEventListener("offline", cb);
}
