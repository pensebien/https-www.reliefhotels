import { rooms } from "@/content/site";
import { quoteStay, type QuoteErrorCode } from "@/lib/booking-engine/quote";
import { bookingWindowError } from "@/lib/booking-engine/booking-window";
import { getRateConfig } from "@/lib/booking-engine/rate-config";
import { rayzaAvailability } from "@/lib/integrations/rayza-sync";
import { getRoomSetup } from "@/lib/room-setup";
import {
  nightsBetween,
  parseDateString,
  type BookingSearchQuery,
} from "@/lib/booking-search";
import {
  countOccupiedUnitsByRoom,
  getRoomInventory,
} from "@/lib/db/inventory-store";

export type AvailableRoom = {
  id: string;
  slug: string;
  category: (typeof rooms)[number]["category"];
  priceFrom: number;
  currency: string;
  availableUnits: number;
  nights: number;
  totalFrom: number;
};

/** A room type with free units that the stay can't be sold on, and why. */
export type RestrictedRoom = {
  id: string;
  code: QuoteErrorCode | "not_bookable_online" | "booking_window";
  message: string;
};

export type RoomAvailabilityResult = {
  checkIn: string;
  checkOut: string;
  nights: number;
  roomsRequested: number;
  guests: number;
  available: AvailableRoom[];
  restricted: RestrictedRoom[];
};

/** Fallback mock when inventory lookup fails — keeps demo usable offline. */
function mockBookedUnits(roomId: string, checkIn: Date, checkOut: Date): number {
  const inventory = 12;
  const daySeed = Math.floor(checkIn.getTime() / 86400000);
  const nightSpan = Math.max(
    1,
    Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000),
  );
  let hash = 0;
  for (const ch of roomId) hash = (hash + ch.charCodeAt(0)) % 97;
  const load = (daySeed + hash + nightSpan * 3) % (inventory + 2);
  return Math.min(inventory - 1, Math.floor(load / 3));
}

export async function getRoomAvailability(
  query: BookingSearchQuery,
): Promise<RoomAvailabilityResult> {
  const checkInDate = parseDateString(query.checkIn);
  const checkOutDate = parseDateString(query.checkOut);
  const nights = nightsBetween(query.checkIn, query.checkOut);

  // One round-trip for all room types, run in parallel — not one per room.
  const [inventoryResult, occupiedResult] = await Promise.allSettled([
    getRoomInventory(),
    countOccupiedUnitsByRoom(query.checkIn, query.checkOut),
  ]);
  const [rateConfig, roomSetup, rayza] = await Promise.all([
    getRateConfig(),
    getRoomSetup(),
    // RAYZA HMS also sells these rooms (front desk, HMS blocks): both must have one free.
    rayzaAvailability(query.checkIn, query.checkOut, nights),
  ]);
  const inventoryByRoom =
    inventoryResult.status === "fulfilled" ? inventoryResult.value : {};
  const occupiedByRoom =
    occupiedResult.status === "fulfilled" ? occupiedResult.value : null;

  const available: AvailableRoom[] = [];
  const restricted: RestrictedRoom[] = [];
  const windowError = bookingWindowError(query.checkIn, rateConfig.engine);

  for (const room of rooms) {
    const inventory = inventoryByRoom[room.id] ?? 1;
    const occupied = occupiedByRoom
      ? (occupiedByRoom[room.id] ?? 0)
      : mockBookedUnits(room.id, checkInDate, checkOutDate);
    const rayzaCheck = rayza?.[room.id];
    const freeUnits = Math.min(Math.max(0, inventory - occupied), rayzaCheck ? rayzaCheck.free : Infinity);

    if (rayzaCheck?.reason) {
      restricted.push({ id: room.id, code: "closed", message: rayzaCheck.reason });
      continue;
    }
    if (freeUnits < query.rooms) continue;
    if (rayzaCheck && Math.ceil(query.guests / query.rooms) > rayzaCheck.maxOccupancy) {
      restricted.push({
        id: room.id,
        code: "over_capacity",
        message: `This room sleeps up to ${rayzaCheck.maxOccupancy} guests per room`,
      });
      continue;
    }

    if (windowError) {
      restricted.push({ id: room.id, code: "booking_window", message: windowError });
      continue;
    }

    if (roomSetup.rooms.find((r) => r.roomId === room.id)?.bookableOnline === false) {
      restricted.push({
        id: room.id,
        code: "not_bookable_online",
        message: "Book this room by contacting the hotel",
      });
      continue;
    }

    // Hide room types the stay can't be sold on (capacity, min-stay, closed to arrival).
    const quote = quoteStay(
      {
        roomId: room.id,
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        guests: query.guests,
        rooms: query.rooms,
      },
      rateConfig,
    );
    if (!quote.ok) {
      restricted.push({ id: room.id, code: quote.code, message: quote.message });
      continue;
    }

    available.push({
      id: room.id,
      slug: room.slug,
      category: room.category,
      priceFrom: room.priceFrom,
      currency: room.currency,
      availableUnits: freeUnits,
      nights,
      totalFrom: quote.totalNgn,
    });
  }

  return {
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    nights,
    roomsRequested: query.rooms,
    guests: query.guests,
    available,
    restricted,
  };
}
