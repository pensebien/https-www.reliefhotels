import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { getActivity } from "@/lib/demo-store";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type RoomBlockType = "maintenance" | "housekeeping";

export type RoomBlock = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
  blockType: RoomBlockType;
  createdAt: string;
};

const DEFAULT_INVENTORY: Record<string, number> = {
  "guest-room": 12,
  "executive-room": 8,
  "signature-suite": 4,
  "presidential-suite": 1,
};

const STORE_DIR = path.join(process.cwd(), "data");
const BLOCKS_FILE = path.join(STORE_DIR, "room-blocks.json");

type BlocksFile = { blocks: RoomBlock[] };

async function readBlocksFile(): Promise<BlocksFile> {
  try {
    const raw = await fs.readFile(BLOCKS_FILE, "utf-8");
    return JSON.parse(raw) as BlocksFile;
  } catch {
    const initial: BlocksFile = { blocks: [] };
    await fs.mkdir(STORE_DIR, { recursive: true });
    await fs.writeFile(BLOCKS_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
}

async function writeBlocksFile(data: BlocksFile): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(BLOCKS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function datesOverlap(
  aIn: string,
  aOut: string,
  bIn: string,
  bOut: string,
): boolean {
  return aIn < bOut && bIn < aOut;
}

export async function getRoomInventory(): Promise<Record<string, number>> {
  if (!isSupabaseEnabled()) return { ...DEFAULT_INVENTORY };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ...DEFAULT_INVENTORY };

  const { data, error } = await supabase.from("room_inventory").select("room_id, total_units");
  if (error || !data?.length) return { ...DEFAULT_INVENTORY };

  const inventory: Record<string, number> = { ...DEFAULT_INVENTORY };
  for (const row of data) {
    inventory[row.room_id as string] = row.total_units as number;
  }
  return inventory;
}

export async function listRoomBlocks(): Promise<RoomBlock[]> {
  if (!isSupabaseEnabled()) {
    const file = await readBlocksFile();
    // Older blocks predate blockType — treat them as maintenance holds.
    return file.blocks.map((b) => ({ ...b, blockType: b.blockType ?? "maintenance" }));
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("room_blocks")
    .select("id, room_id, check_in, check_out, reason, block_type, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    roomId: row.room_id as string,
    checkIn: row.check_in as string,
    checkOut: row.check_out as string,
    reason: (row.reason as string | null) ?? undefined,
    blockType: (row.block_type as RoomBlockType | null) ?? "maintenance",
    createdAt: row.created_at as string,
  }));
}

export async function addRoomBlock(input: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
  blockType?: RoomBlockType;
}): Promise<RoomBlock> {
  if (input.checkOut <= input.checkIn) {
    throw new Error("checkOut must be after checkIn");
  }

  const blockType = input.blockType ?? "maintenance";

  if (!isSupabaseEnabled()) {
    const file = await readBlocksFile();
    const block: RoomBlock = {
      id: randomUUID(),
      roomId: input.roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      reason: input.reason,
      blockType,
      createdAt: new Date().toISOString(),
    };
    file.blocks.unshift(block);
    await writeBlocksFile(file);
    return block;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("room_blocks")
    .insert({
      room_id: input.roomId,
      check_in: input.checkIn,
      check_out: input.checkOut,
      reason: input.reason ?? null,
      block_type: blockType,
    })
    .select("id, room_id, check_in, check_out, reason, block_type, created_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Insert block failed");

  return {
    id: data.id as string,
    roomId: data.room_id as string,
    checkIn: data.check_in as string,
    checkOut: data.check_out as string,
    reason: (data.reason as string | null) ?? undefined,
    blockType: (data.block_type as RoomBlockType | null) ?? "maintenance",
    createdAt: data.created_at as string,
  };
}

export async function deleteRoomBlock(id: string): Promise<boolean> {
  if (!isSupabaseEnabled()) {
    const file = await readBlocksFile();
    const next = file.blocks.filter((b) => b.id !== id);
    if (next.length === file.blocks.length) return false;
    await writeBlocksFile({ blocks: next });
    return true;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { error, count } = await supabase
    .from("room_blocks")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

function tallyByRoom(roomIds: (string | null | undefined)[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of roomIds) {
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/**
 * Occupied units per room (non-cancelled room reservations + room blocks)
 * overlapping [checkIn, checkOut). With Supabase the overlap filter runs in
 * the database — two parallel queries for every room type, with no row cap,
 * so older bookings for future dates are never missed.
 */
export async function countOccupiedUnitsByRoom(
  checkIn: string,
  checkOut: string,
): Promise<Record<string, number>> {
  const supabase = isSupabaseEnabled() ? getSupabaseAdmin() : null;

  if (supabase) {
    const [resResult, blockResult] = await Promise.all([
      supabase
        .from("reservations")
        .select("room_id")
        .eq("item_type", "room")
        .neq("status", "cancelled")
        .not("room_id", "is", null)
        .lt("check_in", checkOut)
        .gt("check_out", checkIn),
      supabase
        .from("room_blocks")
        .select("room_id")
        .lt("check_in", checkOut)
        .gt("check_out", checkIn),
    ]);

    if (resResult.error) throw new Error(resResult.error.message);
    // Same as listRoomBlocks: a missing/unreadable room_blocks table (migration
    // 006 not applied) means "no blocks", not "fall back to mock availability".
    if (blockResult.error) {
      console.warn("[inventory] room_blocks lookup failed:", blockResult.error.message);
    }

    return tallyByRoom([
      ...resResult.data.map((row) => row.room_id as string | null),
      ...(blockResult.data ?? []).map((row) => row.room_id as string | null),
    ]);
  }

  const [{ reservations }, blocks] = await Promise.all([getActivity(), listRoomBlocks()]);
  return tallyByRoom([
    ...reservations
      .filter(
        (r) =>
          r.itemType === "room" &&
          r.status !== "cancelled" &&
          r.checkIn &&
          r.checkOut &&
          datesOverlap(r.checkIn, r.checkOut, checkIn, checkOut),
      )
      .map((r) => r.roomId),
    ...blocks
      .filter((b) => datesOverlap(b.checkIn, b.checkOut, checkIn, checkOut))
      .map((b) => b.roomId),
  ]);
}

export async function countOccupiedUnits(
  roomId: string,
  checkIn: string,
  checkOut: string,
): Promise<number> {
  const counts = await countOccupiedUnitsByRoom(checkIn, checkOut);
  return counts[roomId] ?? 0;
}
