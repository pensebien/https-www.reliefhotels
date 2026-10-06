import type { ReservationRecord } from "@/lib/demo-store";

/** Any payment row: only successful ones count (status is a plain string on dashboard rows). */
type PaymentLike = { status: string; amountKobo: number };

/** Sirvoy-style payment state of a booking: what was collected against its price. */
export type BookingPaymentStatus = "unpaid" | "partial" | "paid" | "overpaid";

export const BOOKING_PAYMENT_STATUSES: readonly BookingPaymentStatus[] = ["unpaid", "partial", "paid", "overpaid"];

/** Naira collected: successful payments less refunds (refunds are negative rows). */
export function collectedNgn(payments: PaymentLike[]): number {
  return payments.filter((p) => p.status === "success").reduce((sum, p) => sum + p.amountKobo, 0) / 100;
}

export function bookingPaymentStatus(
  reservation: Pick<ReservationRecord, "quotedTotalNgn">,
  payments: PaymentLike[],
): BookingPaymentStatus {
  const paid = collectedNgn(payments);
  const total = reservation.quotedTotalNgn;
  if (paid <= 0) return "unpaid";
  // Bookings from before the engine have no locked price: any payment counts as paid.
  if (total === undefined || total <= 0) return "paid";
  if (paid < total) return "partial";
  return paid > total ? "overpaid" : "paid";
}
