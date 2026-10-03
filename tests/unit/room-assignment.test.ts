import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { freeUnits, pickUnitsMinimizingGaps } from "@/lib/room-assignment";

const units = ["guest-room-1", "guest-room-2", "guest-room-3"];

describe("room assignment", () => {
  it("lists rooms with no assigned stay on the requested nights", () => {
    const occupied = [{ unitId: "guest-room-1", checkIn: "2026-10-05", checkOut: "2026-10-08" }];
    assert.deepEqual(freeUnits(units, occupied, "2026-10-06", "2026-10-07"), ["guest-room-2", "guest-room-3"]);
    // Check-out day is free for the next guest.
    assert.deepEqual(freeUnits(units, occupied, "2026-10-08", "2026-10-09"), units);
  });

  it("prefers the room that leaves the fewest empty nights", () => {
    const occupied = [
      { unitId: "guest-room-1", checkIn: "2026-10-01", checkOut: "2026-10-03" }, // 2-night gap before
      { unitId: "guest-room-3", checkIn: "2026-10-02", checkOut: "2026-10-05" }, // back to back
    ];
    assert.deepEqual(pickUnitsMinimizingGaps(units, occupied, "2026-10-05", "2026-10-07", 1), ["guest-room-3"]);
    assert.deepEqual(pickUnitsMinimizingGaps(units, occupied, "2026-10-05", "2026-10-07", 2), ["guest-room-3", "guest-room-1"]);
  });

  it("returns null when not enough rooms are free, and lowest number on ties", () => {
    const occupied = units.slice(0, 2).map((unitId) => ({ unitId, checkIn: "2026-10-05", checkOut: "2026-10-07" }));
    assert.equal(pickUnitsMinimizingGaps(units, occupied, "2026-10-05", "2026-10-06", 2), null);
    assert.deepEqual(pickUnitsMinimizingGaps(units, [], "2026-10-05", "2026-10-06", 1), ["guest-room-1"]);
  });
});
