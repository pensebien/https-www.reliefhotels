/**
 * Phone helpers that avoid putting a contiguous dialable number in static HTML.
 * Digits are stored reversed and only assembled in the browser on interaction.
 */

/** Reversed E.164 digits for +234 803 326 2719 (no +). */
const PHONE_DIGITS_REVERSED = "9172623308432";

export function revealPhoneDigits(): string {
  return PHONE_DIGITS_REVERSED.split("").reverse().join("");
}

export function formatObfuscatedPhoneDisplay(digits: string): string {
  // +234 803 326 2719
  if (digits.length < 13) return digits;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
}

/** Display with mid-section masked until the user expands contact options. */
export function formatMaskedPhoneDisplay(digits: string): string {
  if (digits.length < 13) return "•••• ••• ••••";
  return `+${digits.slice(0, 3)} ••• ••• ${digits.slice(-4)}`;
}

export function buildTelHrefFromDigits(digits: string): string {
  return `tel:+${digits}`;
}

export function buildWhatsAppHrefFromDigits(digits: string): string {
  return `https://wa.me/${digits}`;
}
