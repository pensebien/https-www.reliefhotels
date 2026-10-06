import type { ReservationRecord } from "@/lib/demo-store";
import type { BookingPaymentStatus } from "@/lib/booking-payment-status";

export type BookingExportRow = ReservationRecord & { paidNgn: number; paymentStatus: BookingPaymentStatus };

const COLUMNS: [string, (r: BookingExportRow) => unknown][] = [
  ["Booking", (r) => r.id],
  ["Status", (r) => r.status],
  ["Guest", (r) => `${r.firstName} ${r.lastName}`.trim()],
  ["Email", (r) => r.email],
  ["Phone", (r) => r.phone],
  ["Room type", (r) => r.roomId],
  ["Rooms", (r) => r.units ?? 1],
  ["Room numbers", (r) => r.assignedUnits?.join(" ")],
  ["Check-in", (r) => r.checkIn],
  ["Check-out", (r) => r.checkOut],
  ["Nights", (r) => r.nights],
  ["Guests", (r) => r.guests],
  ["Channel", (r) => r.bookingChannel],
  ["Coupon", (r) => r.couponCode],
  ["Total NGN", (r) => r.quotedTotalNgn],
  ["Paid NGN", (r) => r.paidNgn],
  ["Payment", (r) => r.paymentStatus],
  ["Tags", (r) => r.tags?.join("; ")],
  ["Created", (r) => r.createdAt],
];

/** One cell, quoted when needed; a leading =,+,-,@ is neutralised so spreadsheets don't run it. */
export function csvCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && typeof value === "string") text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function bookingsCsv(rows: BookingExportRow[]): string {
  const lines = [COLUMNS.map(([h]) => h).join(","), ...rows.map((r) => COLUMNS.map(([, get]) => csvCell(get(r))).join(","))];
  return `${lines.join("\r\n")}\r\n`;
}
