import {
  findReservationById,
  listPaymentsForReservation,
  type ReservationRecord,
} from "@/lib/demo-store";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildGuestBookingView, type GuestBookingView } from "./guest-booking";
import { isValidManageToken } from "./manage-link";
import { getRateConfig, type RateConfig } from "./rate-config";

export const manageTokenSchema = z.object({
  id: z.string().uuid(),
  t: z.string().min(16).max(64),
});

export type ManagedBooking = {
  reservation: ReservationRecord;
  view: GuestBookingView;
  config: RateConfig;
};

/**
 * Resolves a manage-booking link to its reservation. Any bad id/token pair
 * gets the same 404, so links can't be used to probe which ids exist.
 */
export async function loadManagedBooking(
  input: unknown,
): Promise<{ ok: true; booking: ManagedBooking } | { ok: false; response: NextResponse }> {
  const notFound = {
    ok: false as const,
    response: NextResponse.json({ error: "Booking not found" }, { status: 404 }),
  };
  const parsed = manageTokenSchema.safeParse(input);
  if (!parsed.success || !isValidManageToken(parsed.data.id, parsed.data.t)) {
    return notFound;
  }

  const reservation = await findReservationById(parsed.data.id);
  if (!reservation || reservation.itemType !== "room") return notFound;

  const [payments, config] = await Promise.all([
    listPaymentsForReservation(reservation.id),
    getRateConfig(),
  ]);
  const view = buildGuestBookingView(
    reservation,
    payments,
    config.cancellation,
    config.depositPct,
  );
  return { ok: true, booking: { reservation, view, config } };
}
