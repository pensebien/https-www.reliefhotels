import { rooms, type RoomCategory } from "@/content/site";

export type BookingCategoryKey =
  | "room"
  | "executive"
  | "suite"
  | "penthouse"
  | "eventsMeetings"
  | "tour"
  | "inquiry";

const ROOM_CATEGORY_TO_KEY: Record<RoomCategory, BookingCategoryKey> = {
  guestRoom: "room",
  executive: "executive",
  suites: "suite",
  penthouse: "penthouse",
};

const STAY_VALUE_TO_KEY: Record<string, BookingCategoryKey> = {
  "guest-room": "room",
  "executive-room": "executive",
  "signature-suite": "suite",
  "presidential-suite": "penthouse",
};

function normalizeToken(raw?: string): string | undefined {
  if (!raw) return undefined;
  const first = raw.split("·")[0]?.trim().toLowerCase();
  return first?.replace(/\s+/g, "-");
}

export function resolveBookingCategoryKey(input: {
  itemType?: "room" | "tour" | "inquiry";
  itemId?: string;
  roomId?: string;
  stayPreference?: string;
}): BookingCategoryKey {
  if (input.itemType === "tour") return "tour";
  if (input.itemType === "inquiry") return "inquiry";

  const token =
    normalizeToken(input.roomId) ??
    normalizeToken(input.itemId) ??
    normalizeToken(input.stayPreference);

  if (token) {
    const room = rooms.find((r) => r.id === token || r.slug === token);
    if (room) return ROOM_CATEGORY_TO_KEY[room.category];

    if (STAY_VALUE_TO_KEY[token]) return STAY_VALUE_TO_KEY[token];

    if (token.includes("event") || token.includes("meeting")) {
      return "eventsMeetings";
    }
    if (token.includes("amenity") || token.includes("spa") || token.includes("fitness") || token.includes("pool")) {
      return "inquiry";
    }
    if (token.includes("experience")) {
      return "tour";
    }
    if (token.includes("executive")) return "executive";
    if (token.includes("presidential") || token.includes("penthouse")) {
      return "penthouse";
    }
    if (token.includes("suite")) return "suite";
    if (token.includes("guest")) return "room";
  }

  return "room";
}
