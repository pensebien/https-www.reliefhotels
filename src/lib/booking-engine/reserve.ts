/**
 * Guest checkout's write path: quote the stay, then check availability and
 * insert in one step so two guests can't both take the last room.
 *
 * - Supabase: reserve_room() takes a per-room advisory lock, counts what is
 *   still holding inventory, and inserts in the same transaction.
 * - File mode: the same check runs inside the JSON store's per-file lock.
 *
 * An unpaid online booking holds its room for RateConfig.holdMinutes; after
 * that it stops counting against inventory (see holdsInventory()).
 */

import { isSupabaseEnabled } from "@/lib/db/client";
import {
  dbAddReservation,
  dbCountCouponRedemptions,
  dbReserveRoom,
} from "@/lib/db/booking-store";
import {
  datesOverlap,
  getRoomInventory,
  listRoomBlocks,
} from "@/lib/db/inventory-store";
import {
  fileAddReservationIf,
  getActivity,
  holdsInventory,
  type NewReservation,
  type ReservationRecord,
} from "@/lib/demo-store";
import { getRoomAvailability } from "@/lib/room-availability";
import { quoteStay, type QuoteError, type QuoteInput, type StayQuote } from "./quote";
import { getRateConfig, type RateConfig } from "./rate-config";

export async function countCouponRedemptions(code: string): Promise<number> {
  const wanted = code.trim().toUpperCase();
  if (isSupabaseEnabled()) return dbCountCouponRedemptions(wanted);
  const { reservations } = await getActivity();
  return reservations.filter(
    (r) => r.couponCode === wanted && r.status !== "cancelled",
  ).length;
}

/** quoteStay with live coupon-redemption counts filled in. */
export async function quoteStayLive(
  input: QuoteInput,
  config?: RateConfig,
): Promise<StayQuote | QuoteError> {
  const couponRedemptions = input.couponCode
    ? await countCouponRedemptions(input.couponCode)
    : 0;
  return quoteStay({ ...input, couponRedemptions }, config ?? (await getRateConfig()));
}

export type ReserveResult =
  | { ok: true; record: ReservationRecord; quote: StayQuote }
  | { ok: false; status: 409 | 422; code: string; message: string };

type GuestDetails = Pick<
  NewReservation,
  "firstName" | "lastName" | "email" | "phone" | "stayPreference" | "message"
>;

const SOLD_OUT: ReserveResult = {
  ok: false,
  status: 409,
  code: "sold_out",
  message:
    "This room is not available for the selected dates. Please choose different dates.",
};

export async function reserveRoom(
  stay: Required<Pick<QuoteInput, "roomId" | "checkIn" | "checkOut" | "guests">> &
    Pick<QuoteInput, "rooms" | "couponCode" | "extraIds">,
  guest: GuestDetails,
): Promise<ReserveResult> {
  const config = await getRateConfig();
  const quote = await quoteStayLive(stay, config);
  if (!quote.ok) {
    return { ok: false, status: 422, code: quote.code, message: quote.message };
  }

  const data: NewReservation = {
    ...guest,
    itemType: "room",
    roomId: quote.roomId,
    checkIn: quote.checkIn,
    checkOut: quote.checkOut,
    nights: quote.nights,
    guests: quote.guests,
    units: quote.rooms,
    couponCode: quote.couponCode,
    extraIds: quote.extras.length ? quote.extras.map((e) => e.id) : undefined,
    quotedTotalNgn: quote.totalNgn,
    quotedDepositNgn: quote.depositNgn,
    holdExpiresAt: new Date(Date.now() + config.holdMinutes * 60_000).toISOString(),
    emailSent: false,
    status: "pending",
  };

  const record = isSupabaseEnabled()
    ? await supabaseReserve(data)
    : await fileReserve(data);

  return record ? { ok: true, record, quote } : SOLD_OUT;
}

async function fileReserve(data: NewReservation): Promise<ReservationRecord | null> {
  const [inventory, blocks] = await Promise.all([getRoomInventory(), listRoomBlocks()]);
  const { roomId, checkIn, checkOut } = data as Required<NewReservation>;
  const total = inventory[roomId] ?? 1;
  const blocked = blocks.filter(
    (b) => b.roomId === roomId && datesOverlap(b.checkIn, b.checkOut, checkIn, checkOut),
  ).length;

  return fileAddReservationIf(data, (existing) => {
    const now = Date.now();
    const used = existing
      .filter(
        (r) =>
          r.itemType === "room" &&
          r.roomId === roomId &&
          r.checkIn &&
          r.checkOut &&
          holdsInventory(r, now) &&
          datesOverlap(r.checkIn, r.checkOut, checkIn, checkOut),
      )
      .reduce((sum, r) => sum + (r.units ?? 1), 0);
    return used + blocked + (data.units ?? 1) <= total;
  });
}

async function supabaseReserve(data: NewReservation): Promise<ReservationRecord | null> {
  const inventory = await getRoomInventory();
  try {
    return await dbReserveRoom(data, inventory[data.roomId!] ?? 1);
  } catch (error) {
    if (!isMissingMigration(error)) throw error;
    // Migration 016 not applied: keep taking bookings the pre-016 way
    // (check, then insert without the new columns) rather than failing.
    console.warn("[reserve] reserve_room() missing — run migration-016; falling back");
    const availability = await getRoomAvailability({
      checkIn: data.checkIn!,
      checkOut: data.checkOut!,
      rooms: data.units ?? 1,
      guests: data.guests,
    });
    if (!availability.available.some((a) => a.id === data.roomId)) return null;
    const legacy: NewReservation = { ...data };
    for (const field of BOOKING_ENGINE_FIELDS) delete legacy[field];
    return dbAddReservation(legacy);
  }
}

const BOOKING_ENGINE_FIELDS = [
  "units",
  "couponCode",
  "extraIds",
  "quotedTotalNgn",
  "quotedDepositNgn",
  "holdExpiresAt",
] as const satisfies readonly (keyof NewReservation)[];

function isMissingMigration(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /reserve_room|schema cache|does not exist/i.test(message);
}
