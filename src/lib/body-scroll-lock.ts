/** Nested-safe body/html scroll lock for modals. */

let lockCount = 0;
let previousBodyOverflow = "";
let previousHtmlOverflow = "";

export function lockBodyScroll() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overflow = previousHtmlOverflow;
    previousBodyOverflow = "";
    previousHtmlOverflow = "";
  }
}

/** Force-clear after navigation or recovery — resets nested lock state. */
export function clearBodyScrollLock() {
  if (typeof document === "undefined") return;
  lockCount = 0;
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
  previousBodyOverflow = "";
  previousHtmlOverflow = "";
}
