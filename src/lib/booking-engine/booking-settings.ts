/**
 * The few booking rules the website still owns. Rates, stay rules and room
 * capacity come from RAYZA; these cover only what happens on the website
 * between "Book" and RAYZA receiving the paid booking.
 */

export type CancellationPolicy = {
  /** Guests may cancel from their manage-booking link. */
  allowGuestCancel: boolean;
  /** Free cancellation until this many hours before check-in (hotel day starts 14:00). */
  freeCancelHoursBefore: number;
  /** Share of what was paid that is refunded when cancelling inside the free window. */
  refundPctWithinWindow: number;
};

export type BookingSettings = {
  /** Share of the stay paid online up front. */
  depositPct: number;
  /** How long an unpaid online booking holds its room. */
  holdMinutes: number;
  cancellation: CancellationPolicy;
};

function envInt(name: string, fallback: number, min: number, max: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

export function getBookingSettings(): BookingSettings {
  return {
    depositPct: envInt("BOOKING_DEPOSIT_PCT", 20, 0, 100),
    holdMinutes: envInt("BOOKING_HOLD_MINUTES", 60, 5, 24 * 60),
    cancellation: {
      allowGuestCancel: process.env.BOOKING_GUEST_CANCEL !== "false",
      freeCancelHoursBefore: envInt("BOOKING_FREE_CANCEL_HOURS", 48, 0, 24 * 60),
      refundPctWithinWindow: envInt("BOOKING_CANCEL_REFUND_PCT", 100, 0, 100),
    },
  };
}
