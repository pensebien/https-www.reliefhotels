import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  addRoomBlock,
  countOccupiedUnits,
  countOccupiedUnitsByRoom,
  deleteRoomBlock,
  getRoomInventory,
} from "@/lib/db/inventory-store";
import { getRoomAvailability } from "@/lib/room-availability";

/** Far-future, room-specific dates so this never collides with real data. */
const CHECK_IN = "2031-03-10";
const CHECK_OUT = "2031-03-12";
const ROOM_ID = "presidential-suite"; // exactly 1 unit — easiest to prove exhaustion

describe("room blocks already reduce bookable availability", () => {
  before(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  let blockId: string | undefined;

  after(async () => {
    if (blockId) await deleteRoomBlock(blockId);
  });

  it("countOccupiedUnits includes overlapping room blocks", async () => {
    const beforeCount = await countOccupiedUnits(ROOM_ID, CHECK_IN, CHECK_OUT);

    const block = await addRoomBlock({
      roomId: ROOM_ID,
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      reason: "test: HVAC maintenance",
    });
    blockId = block.id;

    const afterCount = await countOccupiedUnits(ROOM_ID, CHECK_IN, CHECK_OUT);
    assert.equal(afterCount, beforeCount + 1);
  });

  it("countOccupiedUnitsByRoom counts per room and ignores non-overlapping dates", async () => {
    const overlapping = await countOccupiedUnitsByRoom(CHECK_IN, CHECK_OUT);
    assert.equal(
      overlapping[ROOM_ID],
      await countOccupiedUnits(ROOM_ID, CHECK_IN, CHECK_OUT),
    );

    // Check-out day of the block is free again (half-open [checkIn, checkOut)).
    const adjacent = await countOccupiedUnitsByRoom(CHECK_OUT, "2031-03-13");
    assert.equal(adjacent[ROOM_ID] ?? 0, (overlapping[ROOM_ID] ?? 0) - 1);
  });

  it("getRoomAvailability excludes a fully-blocked room from results", async () => {
    const inventory = await getRoomInventory();
    assert.equal(inventory[ROOM_ID], 1, "test assumes a single-unit room type");

    const result = await getRoomAvailability({
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
      rooms: 1,
      guests: 1,
    });

    const match = result.available.find((r) => r.id === ROOM_ID);
    assert.equal(match, undefined, "the blocked unit must not appear as available");
  });

  it("defaults blockType to maintenance, but honors an explicit housekeeping type", async () => {
    const defaulted = await addRoomBlock({
      roomId: ROOM_ID,
      checkIn: "2031-04-01",
      checkOut: "2031-04-02",
    });
    assert.equal(defaulted.blockType, "maintenance");
    await deleteRoomBlock(defaulted.id);

    const housekeeping = await addRoomBlock({
      roomId: ROOM_ID,
      checkIn: "2031-04-01",
      checkOut: "2031-04-02",
      blockType: "housekeeping",
    });
    assert.equal(housekeeping.blockType, "housekeeping");
    await deleteRoomBlock(housekeeping.id);
  });
});
