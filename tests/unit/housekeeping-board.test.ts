import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHousekeepingBoard } from "@/lib/housekeeping/board";
import { DEFAULT_HOUSEKEEPING_TASKS } from "@/lib/housekeeping/tasks";
import { buildInventoryUnits } from "@/lib/inventory-units";
import type { CalendarReservation } from "@/lib/inventory-calendar";

const units = buildInventoryUnits({ "guest-room": { inventory: 4, unitLabels: ["101", "102", "103", "104"] } }).filter((u) => u.roomId === "guest-room");
const res = (id: string, checkIn: string, checkOut: string, unit: string): CalendarReservation => ({
  id, firstName: id, lastName: "G", email: "g@x", guests: 2, roomId: "guest-room", stayPreference: "x",
  status: "confirmed", source: "live", createdAt: "2026-10-01", checkIn, checkOut, assignedUnits: [unit],
});

describe("housekeeping board", () => {
  const board = buildHousekeepingBoard({
    date: "2026-10-10",
    units,
    reservations: [
      res("leaving", "2026-10-07", "2026-10-10", "guest-room-1"),
      res("next", "2026-10-10", "2026-10-12", "guest-room-1"),
      res("arrive", "2026-10-10", "2026-10-11", "guest-room-2"),
      res("stay", "2026-10-07", "2026-10-14", "guest-room-3"), // night index 3 on the 10th
    ],
    statuses: [{ unitId: "guest-room-1", status: "dirty", updatedAt: "x" }],
    tasks: DEFAULT_HOUSEKEEPING_TASKS.tasks,
    done: [{ unitId: "guest-room-3", taskId: "stayover-tidy", date: "2026-10-10", doneAt: "x" }],
  });
  const room = (label: string) => board.find((r) => r.label === label)!;

  it("shows each room's movement and status", () => {
    assert.deepEqual(board.map((r) => [r.label, r.movement]), [["101", "turnover"], ["102", "arriving"], ["103", "stayover"], ["104", "vacant"]]);
    assert.equal(room("101").status, "dirty");
    assert.equal(room("104").status, "clean");
    assert.equal(room("101").guestName, "next G", "the arriving guest is shown on a turnover");
  });

  it("lists the tasks due: departure + arrival on turnovers, stay-over tasks by frequency", () => {
    assert.deepEqual(room("101").tasks.map((t) => t.id), ["departure-clean", "arrival-check"]);
    // Night index 3: daily tidy and every-3-nights linen are both due; tidy already done.
    assert.deepEqual(room("103").tasks.map((t) => [t.id, t.done]), [["stayover-tidy", true], ["linen-change", false]]);
    assert.deepEqual(room("104").tasks, []);
  });
});
