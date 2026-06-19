import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateDemoSeeds } from "@/content/demo-seed-generator";

describe("generateDemoSeeds", () => {
  it("produces 50+ reservations across room, tour, and experience types", () => {
    const { reservations, payments } = generateDemoSeeds();

    assert.ok(reservations.length >= 50, `expected >= 50 reservations, got ${reservations.length}`);
    assert.ok(payments.length >= 20, `expected >= 20 payments, got ${payments.length}`);

    const rooms = reservations.filter((r) => r.itemType === "room");
    const tours = reservations.filter((r) => r.itemType === "tour");
    const inquiries = reservations.filter((r) => r.itemType === "inquiry");

    assert.ok(rooms.length >= 30);
    assert.ok(tours.length >= 12);
    assert.ok(inquiries.length >= 20);

    const roomIds = new Set(rooms.map((r) => r.roomId));
    assert.ok(roomIds.has("guest-room"));
    assert.ok(roomIds.has("signature-suite"));
    assert.ok(roomIds.has("presidential-suite"));

    const confirmed = reservations.filter((r) => r.status === "confirmed");
    assert.ok(confirmed.length >= 15);

    for (const room of rooms) {
      assert.ok(room.checkIn, `room ${room.id} missing checkIn`);
      assert.ok(room.checkOut, `room ${room.id} missing checkOut`);
    }
  });
});
