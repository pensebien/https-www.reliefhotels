import { rooms } from "@/content/site";
import {
  nightsBetween,
  parseDateString,
  type BookingSearchQuery,
} from "@/lib/booking-search";

/** Units per room type — replace with PMS / Supabase inventory when wired. */
const INVENTORY_BY_ROOM_ID: Record<string, number> = {
  "guest-room": 12,
  "executive-room": 8,
  "signature-suite": 4,
  "presidential-suite": 1,
  "executive-spa": 3,
};

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

/**
 * Mock occupancy for demo — deterministic from dates + room id.
 * Swap this function for a Supabase query when inventory is live.
 */
function mockBookedUnits(roomId: string, checkIn: Date, checkOut: Date): number {
  const inventory = INVENTORY_BY_ROOM_ID[roomId] ?? 1;
  const daySeed = Math.floor(checkIn.getTime() / 86400000);
  const nightSpan = Math.max(
    1,
    Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000),
  );

  let hash = 0;
  for (const ch of roomId) hash = (hash + ch.charCodeAt(0)) % 97;
  const load = (daySeed + hash + nightSpan * 3) % (inventory + 2);

  // Penthouse is a single unit — occasionally full, but usually shown for demo
  if (roomId === "presidential-suite" && nightSpan >= 2 && load % 5 === 0) {
    return inventory;
  }
  if (roomId === "executive-spa" && load % 5 === 0) {
    return Math.max(0, inventory - 1);
  }

  return Math.min(inventory - 1, Math.floor(load / 3));
}

export async function getRoomAvailability(
  query: BookingSearchQuery,
): Promise<RoomAvailabilityResult> {
  const checkInDate = parseDateString(query.checkIn);
  const checkOutDate = parseDateString(query.checkOut);
  const nights = nightsBetween(query.checkIn, query.checkOut);

  const available: AvailableRoom[] = [];

  for (const room of rooms) {
    const inventory = INVENTORY_BY_ROOM_ID[room.id] ?? 1;
    const booked = mockBookedUnits(room.id, checkInDate, checkOutDate);
    const freeUnits = Math.max(0, inventory - booked);

    if (freeUnits < query.rooms) continue;

    const totalFrom = room.priceFrom * nights;

    available.push({
      id: room.id,
      slug: room.slug,
      category: room.category,
      priceFrom: room.priceFrom,
      currency: room.currency,
      availableUnits: freeUnits,
      nights,
      totalFrom,
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
