/**
 * Guest checkout's write path: price the stay from RAYZA, then check and
 * insert in one step so two guests can't both take the last free room.
 *
 * RAYZA's free count already includes paid bookings (they were pushed to
 * it); unpaid website holds are not in it yet. The insert is allowed when
 * active unpaid holds + this booking fit in RAYZA's free count:
 * - Supabase: reserve_room_capped() (migration 025) locks per room type,
 *   counts the holds and inserts in the same transaction.
 * - File mode: the same check runs inside the JSON store's per-file lock.
 *
 * An unpaid booking holds its room for BookingSettings.holdMinutes; RAYZA
 * gets the booking once it's paid (see payment-confirmed.ts).
 */

import { isSupabaseEnabled } from "@/lib/db/client";
import { dbAddReservation, dbReserveRoomCapped } from "@/lib/db/booking-store";
import { nightsBetween } from "@/lib/booking-search";
import { fileAddReservationIf, type NewReservation, type ReservationRecord } from "@/lib/demo-store";
import { rayzaOffers } from "@/lib/integrations/rayza-sync";
import { Logger } from "@/lib/logger";
import { getBookingSettings } from "./booking-settings";
import { isUnpaidHold, unpaidHoldsByRoom } from "./holds";
import { RAYZA_UNAVAILABLE_MESSAGE, quoteStay, type QuoteInput, type StayQuote } from "./quote";

const log = new Logger("reserve");

export type ReserveResult =
  | { ok: true; record: ReservationRecord; quote: StayQuote }
  | { ok: false; status: 409 | 422 | 503; code: string; message: string };

type GuestDetails = Pick<NewReservation, "firstName" | "lastName" | "email" | "phone" | "stayPreference" | "message">;

const SOLD_OUT: ReserveResult = {
  ok: false,
  status: 409,
  code: "sold_out",
  message: "This room is not available for the selected dates. Please choose different dates.",
};

export async function reserveRoom(
  stay: Required<Pick<QuoteInput, "roomId" | "checkIn" | "checkOut" | "guests">> & Pick<QuoteInput, "rooms">,
  guest: GuestDetails,
): Promise<ReserveResult> {
  const settings = getBookingSettings();
  const offers = await rayzaOffers(stay.checkIn, stay.checkOut, nightsBetween(stay.checkIn, stay.checkOut), true);
  if (!offers.ok) return { ok: false, status: 503, code: "rayza_unavailable", message: RAYZA_UNAVAILABLE_MESSAGE };

  // RAYZA's own free count: the atomic insert below subtracts unpaid holds itself.
  const offer = offers.checks[stay.roomId];
  const quote = quoteStay(stay, offer, settings.depositPct);
  if (!quote.ok) {
    return { ok: false, status: quote.code === "sold_out" ? 409 : 422, code: quote.code, message: quote.message };
  }

  const data: NewReservation = {
    ...guest,
    bookingChannel: "online",
    itemType: "room",
    roomId: quote.roomId,
    checkIn: quote.checkIn,
    checkOut: quote.checkOut,
    nights: quote.nights,
    guests: quote.guests,
    units: quote.rooms,
    quotedTotalNgn: quote.totalNgn,
    quotedDepositNgn: quote.depositNgn,
    quoteSnapshot: quote,
    holdExpiresAt: new Date(Date.now() + settings.holdMinutes * 60_000).toISOString(),
    emailSent: false,
    status: "pending",
  };
  const record = isSupabaseEnabled() ? await supabaseReserve(data, quote.free) : await fileReserve(data, quote.free);
  return record ? { ok: true, record, quote } : SOLD_OUT;
}

async function fileReserve(data: NewReservation, capacity: number): Promise<ReservationRecord | null> {
  const { roomId, checkIn, checkOut } = data as Required<NewReservation>;
  return fileAddReservationIf(data, (existing) => {
    const now = Date.now();
    const held = existing
      .filter(
        (r) => r.roomId === roomId && r.checkIn && r.checkOut && r.checkIn < checkOut && r.checkOut > checkIn && isUnpaidHold(r, now),
      )
      .reduce((sum, r) => sum + (r.units ?? 1), 0);
    return held + (data.units ?? 1) <= capacity;
  });
}

async function supabaseReserve(data: NewReservation, capacity: number): Promise<ReservationRecord | null> {
  try {
    return await dbReserveRoomCapped(data, capacity);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/reserve_room_capped|schema cache|does not exist/i.test(message)) throw error;
    // Migration 025 not applied: same check, but not atomic. Run migration-025.
    log.warning("reserve_room_capped() missing, using non-atomic check; run migration-025");
    const held = (await unpaidHoldsByRoom(data.checkIn!, data.checkOut!))[data.roomId!] ?? 0;
    if (held + (data.units ?? 1) > capacity) return null;
    return dbAddReservation(data);
  }
}
