/** Pure helper, safe for client and server. */

/**
 * Normalises a typed phone number to digits with country code, or null when it
 * can't be a WhatsApp number. Local Nigerian formats (0801…, 801…) get 234.
 */
export function normalizeWhatsappNumber(input: string): string | null {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) digits = digits.slice(2);
  else if (trimmed.startsWith("+")) {
    // already international
  } else if (/^0\d{10}$/.test(digits)) digits = `234${digits.slice(1)}`;
  else if (/^[789]\d{9}$/.test(digits)) digits = `234${digits}`;
  return /^[1-9]\d{9,14}$/.test(digits) ? digits : null;
}
