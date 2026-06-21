/** Digits only — wa.me expects country code without + or spaces. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function toMailtoHref(email: string): string {
  return `mailto:${email.trim()}`;
}

export function toTelHref(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("tel:")) return trimmed;
  const compact = trimmed.replace(/\s/g, "");
  return compact.startsWith("+") ? `tel:${compact}` : `tel:+${phoneDigits(compact)}`;
}

export function toWhatsAppHref(phone: string): string {
  return `https://wa.me/${phoneDigits(phone)}`;
}

export function isMobileContactDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
