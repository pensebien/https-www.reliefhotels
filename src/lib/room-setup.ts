/**
 * Owner-editable room setup per room type: how many rooms exist, whether the
 * type is sold online, the physical room numbers, and the photos guests see.
 * Edited from /staff/settings/rooms (manager). Room names, descriptions and
 * amenities stay translated content in src/content/site.ts + messages/.
 *
 * Inventory is the single number availability, reserve_room() and the staff
 * calendar all count against: in Supabase it is also written to
 * `room_inventory` (read by reserve_room); in file mode it lives here.
 */

import { rooms } from "@/content/site";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { readSettingsDoc, writeSettingsDoc } from "@/lib/settings-store";
import { z } from "zod";

export const DEFAULT_INVENTORY: Record<string, number> = {
  "guest-room": 12,
  "executive-room": 8,
  "signature-suite": 4,
  "presidential-suite": 1,
};

const photoUrl = z
  .string()
  .trim()
  .max(500)
  .refine((u) => u.startsWith("/") || /^https:\/\//.test(u), {
    message: "Photo must be an uploaded image or an https:// link",
  });

export const roomSetupRoomSchema = z
  .object({
    roomId: z.string().min(1),
    inventory: z.number().int().min(1).max(200),
    bookableOnline: z.boolean(),
    /** Physical room numbers, one per unit, e.g. ["101", "102"]. */
    unitLabels: z.array(z.string().trim().min(1).max(20)).max(200),
    /** First photo is the main image; empty = the website's built-in photos. */
    photos: z.array(photoUrl).max(12),
  })
  .superRefine((room, ctx) => {
    if (room.unitLabels.length !== room.inventory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${room.roomId}: give exactly one room number per room (${room.inventory})`,
        path: ["unitLabels"],
      });
    }
    const seen = new Set<string>();
    for (const label of room.unitLabels) {
      const key = label.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${room.roomId}: room number ${label} is listed twice`,
          path: ["unitLabels"],
        });
      }
      seen.add(key);
    }
  });

export const roomSetupSchema = z
  .object({ rooms: z.array(roomSetupRoomSchema) })
  .superRefine((setup, ctx) => {
    const all = new Map<string, string>();
    for (const room of setup.rooms) {
      for (const label of room.unitLabels) {
        const other = all.get(label.toLowerCase());
        if (other && other !== room.roomId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Room number ${label} is used by two room types`,
            path: ["rooms"],
          });
        }
        all.set(label.toLowerCase(), room.roomId);
      }
    }
  });

export type RoomSetupRoom = z.infer<typeof roomSetupRoomSchema>;
export type RoomSetup = z.infer<typeof roomSetupSchema>;

/**
 * Placeholder numbers until staff enter the real ones: each room type gets its
 * own hundred (Standard 101…, Executive 201…), so defaults never collide.
 */
function nextDefaultLabel(roomId: string, taken: string[]): string {
  const base = (Math.max(0, rooms.findIndex((r) => r.id === roomId)) + 1) * 100;
  let n = base + taken.length + 1;
  while (taken.includes(String(n))) n++;
  return String(n);
}

function defaultLabels(roomId: string, count: number): string[] {
  const labels: string[] = [];
  while (labels.length < count) labels.push(nextDefaultLabel(roomId, labels));
  return labels;
}

function defaultRoom(roomId: string): RoomSetupRoom {
  const inventory = DEFAULT_INVENTORY[roomId] ?? 1;
  return {
    roomId,
    inventory,
    bookableOnline: true,
    unitLabels: defaultLabels(roomId, inventory),
    photos: [],
  };
}

export const DEFAULT_ROOM_SETUP: RoomSetup = {
  rooms: rooms.map((room) => defaultRoom(room.id)),
};

/**
 * Stored documents merge over defaults per catalog room, and room numbers are
 * padded/trimmed to the inventory, so a room type added later or an older
 * document never breaks the calendar.
 */
export function normalizeRoomSetup(raw: unknown): RoomSetup {
  const stored = (raw && typeof raw === "object" ? raw : {}) as Partial<RoomSetup>;
  const merged: RoomSetup = {
    rooms: rooms.map((room) => {
      const saved = stored.rooms?.find((r) => r?.roomId === room.id);
      if (!saved) return defaultRoom(room.id);
      const base = { ...defaultRoom(room.id), ...saved };
      const labels = [...(base.unitLabels ?? [])].slice(0, base.inventory);
      while (labels.length < base.inventory) labels.push(nextDefaultLabel(room.id, labels));
      return { ...base, unitLabels: labels };
    }),
  };
  const parsed = roomSetupSchema.safeParse(merged);
  if (!parsed.success) {
    console.error("[room-setup] stored setup invalid — using defaults", parsed.error.issues);
    return DEFAULT_ROOM_SETUP;
  }
  return parsed.data;
}

const KEY = "room_setup";

export function getRoomSetup(): Promise<RoomSetup> {
  return readSettingsDoc(KEY, normalizeRoomSetup);
}

export class RoomSetupValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join("; "));
  }
}

export async function saveRoomSetup(input: unknown): Promise<RoomSetup> {
  const parsed = roomSetupSchema.safeParse(input);
  if (!parsed.success) {
    throw new RoomSetupValidationError(parsed.error.issues.map((i) => i.message));
  }
  const setup = normalizeRoomSetup(parsed.data);

  if (isSupabaseEnabled()) {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error("Supabase not configured");
    // reserve_room() reads inventory from room_inventory.
    const { error } = await supabase.from("room_inventory").upsert(
      setup.rooms.map((r) => ({
        room_id: r.roomId,
        total_units: r.inventory,
        updated_at: new Date().toISOString(),
      })),
    );
    if (error) throw new Error(error.message);
  }

  return writeSettingsDoc(KEY, setup);
}

/** `${roomId}-${n}` unit ids, as used by the staff calendar and room assignment. */
export function unitIdsFor(room: RoomSetupRoom): string[] {
  return room.unitLabels.map((_, i) => `${room.roomId}-${i + 1}`);
}

/** unitId → room number label, e.g. "guest-room-3" → "103". */
export function unitLabelMap(setup: RoomSetup): Record<string, string> {
  const map: Record<string, string> = {};
  for (const room of setup.rooms) {
    room.unitLabels.forEach((label, i) => {
      map[`${room.roomId}-${i + 1}`] = label;
    });
  }
  return map;
}
