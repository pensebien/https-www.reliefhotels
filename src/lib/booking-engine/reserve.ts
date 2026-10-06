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
import { addDaysToDateString } from "@/lib/booking-search";
import {
  fileAddReservationIf,
  getActivity,
  holdsInventory,
  listReservationsForReport,
  updateReservationById,
  type NewReservation,
  type ReservationRecord,
} from "@/lib/demo-store";
import { rayzaRejection } from "@/lib/integrations/rayza-sync";
import { getRoomAvailability } from "@/lib/room-availability";
import { autoAssignRooms } from "@/lib/room-assignment";
import { roomDisplayName } from "@/lib/room-names";
import { getRoomSetup } from "@/lib/room-setup";
import { bookingWindowError } from "./booking-window";
import { quoteGroup, type GroupQuote, type GroupQuoteInput } from "./group";
import { quoteStay, type QuoteError, type QuoteInput, type StayQuote } from "./quote";
import { getRateConfig, type RateConfig } from "./rate-config";

/**
 * Extras with a daily stock (e.g. 3 airport pickups a day): the first one
 * already taken on every night of the stay, as a guest-facing message.
 * A soft limit — checked before the insert, not inside its lock.
 */
export async function extrasStockError(
  extras: { id: string; label: string }[],
  checkIn: string,
  checkOut: string,
  config?: RateConfig,
): Promise<string | null> {
  const rates = config ?? (await getRateConfig());
  const limited = extras
    .map((e) => ({ ...e, stock: rates.extras.find((x) => x.id === e.id)?.stockPerDay }))
    .filter((e): e is { id: string; label: string; stock: number } => typeof e.stock === "number");
  if (limited.length === 0) return null;
  const nights = eachNight(checkIn, checkOut);
  const others = (await listReservationsForReport(checkIn, nights[nights.length - 1])).filter(
    (r) => holdsInventory(r) && r.checkIn && r.checkOut && r.checkIn < checkOut && r.checkOut > checkIn,
  );
  for (const extra of limited) {
    for (const night of nights) {
      const taken = others.filter((r) => r.extraIds?.includes(extra.id) && r.checkIn! <= night && r.checkOut! > night).length;
      if (taken >= extra.stock) return `${extra.label} is fully booked on ${night}. Please remove it or change your dates.`;
    }
  }
  return null;
}

function eachNight(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDaysToDateString(d, 1)) nights.push(d);
  return nights;
}

export async function countCouponRedemptions(code: string): Promise<number> {
  const wanted = code.trim().toUpperCase();
  if (isSupabaseEnabled()) return dbCountCouponRedemptions(wanted);
  const { reservations } = await getActivity();
  // A group booking uses the code once, however many room types it has.
  return new Set(
    reservations
      .filter((r) => r.couponCode === wanted && r.status !== "cancelled")
      .map((r) => r.groupId ?? r.id),
  ).size;
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

export type ReserveOptions = {
  /** Initial status; the front desk may create confirmed bookings. Default pending. */
  status?: ReservationRecord["status"];
  /**
   * Whether an unpaid booking's room hold expires (online checkout). Front-desk
   * bookings hold indefinitely, as before, until staff change their status.
   */
  expiringHold?: boolean;
  /** "online" (default) enforces the room type's bookable-online switch; the desk ignores it. */
  channel?: "online" | "desk";
};

function notBookableOnline(roomIds: string[], setup: Awaited<ReturnType<typeof getRoomSetup>>) {
  return roomIds.some((id) => setup.rooms.find((r) => r.roomId === id)?.bookableOnline === false);
}

const NOT_ONLINE: ReserveResult = {
  ok: false,
  status: 422,
  code: "not_bookable_online",
  message: "This room can't be booked online. Please contact the hotel.",
};

function toNewReservation(
  quote: StayQuote,
  guest: GuestDetails,
  config: RateConfig,
  status: ReservationRecord["status"],
  expiringHold: boolean,
  groupId?: string,
  bookingChannel: "online" | "desk" = "online",
): NewReservation {
  return {
    ...guest,
    bookingChannel,
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
    quoteSnapshot: quote,
    groupId,
    holdExpiresAt: expiringHold
      ? new Date(Date.now() + config.holdMinutes * 60_000).toISOString()
      : undefined,
    emailSent: false,
    status,
  };
}

/**
 * Atomic check-and-insert for one room-type line, then the best-effort
 * follow-ups: store the price breakdown and group id (reserve_room() inserts
 * the 016 columns only) and auto-assign rooms. Null when sold out.
 */
async function insertLine(data: NewReservation): Promise<ReservationRecord | null> {
  const record = isSupabaseEnabled() ? await supabaseReserve(data) : await fileReserve(data);
  if (!record) return null;

  let saved = record;
  const missing: Partial<ReservationRecord> = {};
  if (!record.quoteSnapshot && data.quoteSnapshot) missing.quoteSnapshot = data.quoteSnapshot;
  if (!record.groupId && data.groupId) missing.groupId = data.groupId;
  if (!record.bookingChannel && data.bookingChannel) missing.bookingChannel = data.bookingChannel;
  if (Object.keys(missing).length) {
    saved =
      (await updateReservationById(record.id, missing).catch((error) => {
        console.warn("[reserve] follow-up fields not stored:", error);
        return null;
      })) ?? record;
  }

  // Give the booking physical rooms straight away (minimise gaps). Never
  // fails the booking — staff can assign from the calendar instead.
  return autoAssignRooms(saved).catch((error) => {
    console.warn("[reserve] auto room assignment skipped:", error);
    return saved;
  });
}

export async function reserveRoom(
  stay: Required<Pick<QuoteInput, "roomId" | "checkIn" | "checkOut" | "guests">> &
    Pick<QuoteInput, "rooms" | "couponCode" | "extraIds" | "ignoreRestrictions" | "ratePlanId" | "linkRatePlanId">,
  guest: GuestDetails,
  options: ReserveOptions = {},
): Promise<ReserveResult> {
  const { status = "pending", expiringHold = true, channel = "online" } = options;
  if (channel === "online" && notBookableOnline([stay.roomId], await getRoomSetup())) {
    return NOT_ONLINE;
  }
  const config = await getRateConfig();
  const windowError = channel === "online" ? bookingWindowError(stay.checkIn, config.engine) : null;
  if (windowError) return { ok: false, status: 422, code: "booking_window", message: windowError };
  const quote = await quoteStayLive(stay, config);
  if (!quote.ok) {
    return { ok: false, status: 422, code: quote.code, message: quote.message };
  }
  const rayzaNo = await rayzaRejection(
    [{ roomId: quote.roomId, rooms: quote.rooms, guests: quote.guests }],
    quote.checkIn,
    quote.checkOut,
    quote.nights,
  );
  if (rayzaNo) return { ok: false, status: 409, code: "sold_out", message: rayzaNo };
  const extraNo = await extrasStockError(quote.extras, quote.checkIn, quote.checkOut, config);
  if (extraNo) return { ok: false, status: 409, code: "extra_sold_out", message: extraNo };

  const record = await insertLine(toNewReservation(quote, guest, config, status, expiringHold, undefined, channel));
  return record ? { ok: true, record, quote } : SOLD_OUT;
}

export type ReserveGroupResult =
  | { ok: true; lead: ReservationRecord; records: ReservationRecord[]; quote: GroupQuote }
  | { ok: false; status: 409 | 422; code: string; message: string };

/**
 * Several room types, same dates, one checkout. The lead line is inserted
 * first and its id becomes the group id. If a later line has sold out, the
 * lines already taken are cancelled so the group never half-books.
 */
export async function reserveGroup(
  input: Omit<GroupQuoteInput, "couponRedemptions">,
  guest: GuestDetails,
  options: ReserveOptions = {},
): Promise<ReserveGroupResult> {
  const { status = "pending", expiringHold = true, channel = "online" } = options;
  if (channel === "online" && notBookableOnline(input.stays.map((s) => s.roomId), await getRoomSetup())) {
    return NOT_ONLINE as Extract<ReserveGroupResult, { ok: false }>;
  }
  const config = await getRateConfig();
  const windowError = channel === "online" ? bookingWindowError(input.checkIn, config.engine) : null;
  if (windowError) return { ok: false, status: 422, code: "booking_window", message: windowError };
  const couponRedemptions = input.couponCode ? await countCouponRedemptions(input.couponCode) : 0;
  const quote = quoteGroup({ ...input, couponRedemptions }, config);
  if (!quote.ok) return { ok: false, status: 422, code: quote.code, message: quote.message };
  const rayzaNo = await rayzaRejection(
    quote.lines.map((l) => ({ roomId: l.roomId, rooms: l.rooms, guests: l.guests })),
    input.checkIn,
    input.checkOut,
    quote.lines[0].nights,
  );
  if (rayzaNo) return { ok: false, status: 409, code: "sold_out", message: rayzaNo };
  const extraNo = await extrasStockError(quote.lines[0].extras, input.checkIn, input.checkOut, config);
  if (extraNo) return { ok: false, status: 409, code: "extra_sold_out", message: extraNo };

  const records: ReservationRecord[] = [];
  let groupId: string | undefined;
  for (const line of quote.lines) {
    const record = await insertLine(toNewReservation(line, guest, config, status, expiringHold, groupId, channel));
    if (!record) {
      const cancelledAt = new Date().toISOString();
      await Promise.all(
        records.map((r) =>
          updateReservationById(r.id, {
            status: "cancelled",
            cancelledAt,
            staffNotes: "Released automatically: another room in this group booking sold out.",
          }),
        ),
      );
      return {
        ok: false,
        status: 409,
        code: "sold_out",
        message: `${roomDisplayName(line.roomId)} is no longer available for these dates. Please change your rooms or dates.`,
      };
    }
    if (!groupId) {
      groupId = record.id;
      records.push((await updateReservationById(record.id, { groupId })) ?? { ...record, groupId });
    } else {
      records.push(record);
    }
  }
  return { ok: true, lead: records[0], records, quote };
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
  "quoteSnapshot",
  "groupId",
  "bookingChannel",
] as const satisfies readonly (keyof NewReservation)[];

function isMissingMigration(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /reserve_room|schema cache|does not exist/i.test(message);
}
