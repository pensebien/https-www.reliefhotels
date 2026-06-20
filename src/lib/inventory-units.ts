import { rooms } from "@/content/site";
import { eventSpaces } from "@/features/phase-2-product-expansion/content/event-spaces";

/** Units per room type — aligned with public availability API. */
export const INVENTORY_BY_ROOM_ID: Record<string, number> = {
  "guest-room": 12,
  "executive-room": 8,
  "signature-suite": 4,
  "presidential-suite": 1,
  "executive-spa": 3,
};

export type InventoryUnitKind = "room" | "event";

export type InventoryUnit = {
  id: string;
  roomId: string;
  labelKey: string;
  category: "guestRoom" | "executive" | "suites" | "penthouse" | "eventsMeetings";
  kind: InventoryUnitKind;
  unitIndex: number;
};

export function buildInventoryUnits(): InventoryUnit[] {
  const units: InventoryUnit[] = [];

  for (const room of rooms) {
    const count = INVENTORY_BY_ROOM_ID[room.id] ?? 1;
    for (let i = 1; i <= count; i += 1) {
      units.push({
        id: `${room.id}-${i}`,
        roomId: room.id,
        labelKey: room.nameKey,
        category: room.category,
        kind: "room",
        unitIndex: i,
      });
    }
  }

  for (const space of eventSpaces) {
    units.push({
      id: space.id,
      roomId: space.id,
      labelKey: space.nameKey,
      category: "eventsMeetings",
      kind: "event",
      unitIndex: 1,
    });
  }

  return units;
}

export function resolveReservationRoomId(input: {
  roomId?: string;
  stayPreference?: string;
  itemType?: string;
}): string | undefined {
  const token =
    input.roomId?.trim().toLowerCase() ??
    input.stayPreference?.split("·")[0]?.trim().toLowerCase().replace(/\s+/g, "-");

  if (!token) return undefined;

  const room = rooms.find((r) => r.id === token || r.slug === token);
  if (room) return room.id;

  const aliases: Record<string, string> = {
    "guest-room": "guest-room",
    "executive-room": "executive-room",
    "signature-suite": "signature-suite",
    "presidential-suite": "presidential-suite",
    "executive-spa": "executive-spa",
  };

  return aliases[token];
}
