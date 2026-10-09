import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteStay } from "@/lib/booking-engine/quote";

const offer = { free: 3, maxOccupancy: 2, nightlyNgn: 50_000 };
const stay = { roomId: "guest-room", checkIn: "2031-03-01", checkOut: "2031-03-04", guests: 2 };

describe("quoteStay (RAYZA offer)", () => {
  it("prices nights × rooms at RAYZA's rate with the deposit share", () => {
    const quote = quoteStay({ ...stay, guests: 3, rooms: 2 }, offer, 20);
    assert.ok(quote.ok);
    assert.equal(quote.nights, 3);
    assert.equal(quote.totalNgn, 300_000);
    assert.equal(quote.depositNgn, 60_000);
    assert.equal(quote.nightlyNgn, 50_000);
  });

  it("rejects bad dates, unknown rooms, sold-out and over-capacity stays", () => {
    assert.equal(quoteStay({ ...stay, checkOut: stay.checkIn }, offer, 20).ok, false);
    const unknown = quoteStay(stay, undefined, 20);
    assert.equal(!unknown.ok && unknown.code, "unknown_room");
    const soldOut = quoteStay({ ...stay, rooms: 4 }, offer, 20);
    assert.equal(!soldOut.ok && soldOut.code, "sold_out");
    const tooMany = quoteStay({ ...stay, guests: 3 }, offer, 20);
    assert.equal(!tooMany.ok && tooMany.code, "over_capacity");
  });

  it("passes on RAYZA's own reason (closed to arrival, minimum stay)", () => {
    const closed = quoteStay(stay, { ...offer, free: 0, reason: "Minimum stay is 4 nights" }, 20);
    assert.deepEqual(closed, { ok: false, code: "closed", message: "Minimum stay is 4 nights" });
  });

  it("a 0% deposit means nothing is due now", () => {
    const quote = quoteStay(stay, offer, 0);
    assert.ok(quote.ok);
    assert.equal(quote.depositNgn, 0);
  });
});
