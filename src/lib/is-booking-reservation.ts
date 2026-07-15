/** Room/tour bookings that belong in the booking inbox (not guest feedback). */
export function isBookingReservation(itemType?: string | null): boolean {
  return itemType !== "inquiry";
}
