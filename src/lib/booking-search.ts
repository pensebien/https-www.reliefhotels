export type BookingSearchQuery = {
  checkIn: string;
  checkOut: string;
  rooms: number;
  guests: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function defaultCheckInDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

export function defaultCheckOutDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 9);
  return d;
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateString(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function parseBookingSearchParams(
  params: URLSearchParams,
): BookingSearchQuery | null {
  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");
  if (!checkIn || !checkOut || !DATE_RE.test(checkIn) || !DATE_RE.test(checkOut)) {
    return null;
  }

  const from = parseDateString(checkIn);
  const to = parseDateString(checkOut);
  if (to <= from) return null;

  const rooms = Math.min(4, Math.max(1, Number(params.get("rooms") ?? "1") || 1));
  const guests = Math.min(12, Math.max(1, Number(params.get("guests") ?? "1") || 1));

  return { checkIn, checkOut, rooms, guests };
}

export function bookingSearchToQueryString(query: BookingSearchQuery): string {
  const sp = new URLSearchParams({
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    rooms: String(query.rooms),
    guests: String(query.guests),
  });
  return sp.toString();
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const from = parseDateString(checkIn);
  const to = parseDateString(checkOut);
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
}
