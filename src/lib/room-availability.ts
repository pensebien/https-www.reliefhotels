import { rooms } from "@/content/site";
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

export type RoomAvailabilityResult = {
  checkIn: string;
  checkOut: string;
  nights: number;
  roomsRequested: number;
  guests: number;
  available: AvailableRoom[];
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
  const inventoryByRoom =
    inventoryResult.status === "fulfilled" ? inventoryResult.value : {};
  const occupiedByRoom =
    occupiedResult.status === "fulfilled" ? occupiedResult.value : null;

  const available: AvailableRoom[] = [];

  for (const room of rooms) {
    const inventory = inventoryByRoom[room.id] ?? 1;
    const occupied = occupiedByRoom
      ? (occupiedByRoom[room.id] ?? 0)
      : mockBookedUnits(room.id, checkInDate, checkOutDate);
    const freeUnits = Math.max(0, inventory - occupied);

    if (freeUnits < query.rooms) continue;

    available.push({
      id: room.id,
      slug: room.slug,
      category: room.category,
      priceFrom: room.priceFrom,
      currency: room.currency,
      availableUnits: freeUnits,
      nights,
      totalFrom: room.priceFrom * nights,
    });
  }

  return {
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    nights,
    roomsRequested: query.rooms,
    guests: query.guests,
    available,
  };
}
