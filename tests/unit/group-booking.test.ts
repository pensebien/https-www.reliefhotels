import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allocateGuests, quoteGroup } from "@/lib/booking-engine/group";
import { DEFAULT_RATE_CONFIG, type RateConfig } from "@/lib/booking-engine/rate-config";

const config: RateConfig = {
  ...DEFAULT_RATE_CONFIG,
  coupons: [{ code: "TEN", pct: 10, active: true }],
  extras: [{ id: "pickup", label: "Airport pickup", priceNgn: 25_000, pricing: "per_stay", active: true }],
};

describe("group booking", () => {
  it("seats guests type by type up to capacity, at least one per room type", () => {
    const stays = [{ roomId: "guest-room", rooms: 2 }, { roomId: "signature-suite", rooms: 1 }];
    assert.deepEqual(allocateGuests(stays, 6, config), [4, 2]); // 2×2 + 1×3 capacity
    assert.deepEqual(allocateGuests(stays, 2, config), [1, 1]);
    assert.equal(allocateGuests(stays, 8, config), null, "over capacity");
    assert.equal(allocateGuests(stays, 1, config), null, "fewer guests than room types");
  });

  it("prices each room type, puts extras on the lead line and sums totals and deposits", () => {
    const q = quoteGroup(
      {
        checkIn: "2026-10-05", checkOut: "2026-10-07", guests: 5,
        stays: [{ roomId: "guest-room", rooms: 2 }, { roomId: "signature-suite", rooms: 1 }],
        couponCode: "ten", extraIds: ["pickup"],
      },
      config,
    );
    assert.ok(q.ok);
    // guest-room: 95k × 2 nights × 2 rooms = 380k − 10% = 342k, + pickup 25k; suite: 185k × 2 = 370k − 10% = 333k.
    assert.equal(q.lines[0].totalNgn, 342_000 + 25_000);
    assert.equal(q.lines[1].totalNgn, 333_000);
    assert.equal(q.lines[1].extras.length, 0);
    assert.equal(q.totalNgn, 342_000 + 25_000 + 333_000);
    assert.equal(q.depositNgn, q.lines[0].depositNgn + q.lines[1].depositNgn);
  });

  it("rejects duplicate room types and parties that don't fit", () => {
    const base = { checkIn: "2026-10-05", checkOut: "2026-10-07" };
    assert.equal(quoteGroup({ ...base, guests: 2, stays: [{ roomId: "guest-room", rooms: 1 }, { roomId: "guest-room", rooms: 1 }] }, config).ok, false);
    const crowded = quoteGroup({ ...base, guests: 9, stays: [{ roomId: "guest-room", rooms: 1 }, { roomId: "executive-room", rooms: 1 }] }, config);
    assert.equal(!crowded.ok && crowded.code, "over_capacity");
  });
});
