import { rooms } from "@/content/site";
import { getBookingSettings } from "@/lib/booking-engine/booking-settings";
import { unpaidHoldsByRoom } from "@/lib/booking-engine/holds";
import { RAYZA_UNAVAILABLE_MESSAGE, quoteStay, type QuoteErrorCode } from "@/lib/booking-engine/quote";
import { rayzaOffers } from "@/lib/integrations/rayza-sync";
import { nightsBetween, type BookingSearchQuery } from "@/lib/booking-search";

export type AvailableRoom = {
  id: string;
  slug: string;
  category: (typeof rooms)[number]["category"];
  /** RAYZA's tax-inclusive nightly price for these dates. */
  priceFrom: number;
  currency: string;
  availableUnits: number;
  nights: number;
  totalFrom: number;
};

/** A room type RAYZA has but can't sell for this search, and why. */
export type RestrictedRoom = {
  id: string;
  code: QuoteErrorCode;
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
  /**
   * RAYZA couldn't be asked (switched off, no rooms linked, or unreachable):
   * nothing is sold online and guests are pointed to phone/WhatsApp.
   */
  liveUnavailable: boolean;
  liveUnavailableMessage?: string;
};

export async function getRoomAvailability(query: BookingSearchQuery): Promise<RoomAvailabilityResult> {
  const nights = nightsBetween(query.checkIn, query.checkOut);
  const result: RoomAvailabilityResult = {
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    nights,
    roomsRequested: query.rooms,
    guests: query.guests,
    available: [],
    restricted: [],
    liveUnavailable: false,
  };

  const [offers, holds] = await Promise.all([
    rayzaOffers(query.checkIn, query.checkOut, nights),
    unpaidHoldsByRoom(query.checkIn, query.checkOut),
  ]);
  if (!offers.ok) {
    return { ...result, liveUnavailable: true, liveUnavailableMessage: RAYZA_UNAVAILABLE_MESSAGE };
  }

  const { depositPct } = getBookingSettings();
  for (const room of rooms) {
    const offer = offers.checks[room.id];
    // Not linked to a RAYZA room type: not sold online.
    if (!offer) continue;
    const free = Math.max(0, offer.free - (holds[room.id] ?? 0));
    const quote = quoteStay(
      { roomId: room.id, checkIn: query.checkIn, checkOut: query.checkOut, guests: query.guests, rooms: query.rooms },
      { ...offer, free },
      depositPct,
    );
    if (!quote.ok) {
      // Sold out simply isn't listed; anything else is shown with its reason.
      if (quote.code !== "sold_out") result.restricted.push({ id: room.id, code: quote.code, message: quote.message });
      continue;
    }
    result.available.push({
      id: room.id,
      slug: room.slug,
      category: room.category,
      priceFrom: offer.nightlyNgn,
      currency: room.currency,
      availableUnits: free,
      nights,
      totalFrom: quote.totalNgn,
    });
  }
  return result;
}
