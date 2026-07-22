import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rooms } from "@/content/site";
import { suggestedDepositNgn } from "@/features/cashier/lib/helpers";
import { calculateDepositNgn } from "@/lib/booking-deposit";

describe("cashier suggested deposit (business case alignment)", () => {
  it("suggests 20% of catalog stay, matching online Paystack deposit", () => {
    const room = rooms.find((r) => r.id === "guest-room");
    assert.ok(room);

    const suggested = suggestedDepositNgn({
      id: "00000000-0000-4000-8000-000000000001",
      firstName: "Ada",
      lastName: "O",
      email: "ada@example.com",
      guests: 2,
      roomId: "guest-room",
      stayPreference: "guest-room",
      status: "pending",
      source: "web",
      createdAt: new Date().toISOString(),
      checkIn: "2027-09-01",
      checkOut: "2027-09-03",
      nights: 2,
    });

    assert.equal(suggested, calculateDepositNgn(room.priceFrom, 2));
  });
});
