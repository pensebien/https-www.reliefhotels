import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkinState } from "@/lib/checkin/availability";
import { DEFAULT_CHECKIN_SETTINGS } from "@/lib/checkin/settings";
import type { ReservationRecord } from "@/lib/demo-store";

const NOW = Date.parse("2026-10-10T10:00:00Z"); // Calabar date 2026-10-10

function res(over: Partial<ReservationRecord>): ReservationRecord {
  return {
    id: "r", firstName: "A", lastName: "B", email: "a@b.c", itemType: "room", roomId: "guest-room",
    checkIn: "2026-10-12", checkOut: "2026-10-14", guests: 2, stayPreference: "x", message: "x",
    status: "confirmed", source: "live", createdAt: "2026-10-01T00:00:00Z", emailSent: true, ...over,
  };
}

describe("online check-in window", () => {
  const s = DEFAULT_CHECKIN_SETTINGS; // opens 3 days before
  it("opens N days before arrival for confirmed bookings", () => {
    assert.equal(checkinState([res({})], s, false, NOW).state, "open");
    assert.deepEqual(checkinState([res({ checkIn: "2026-10-20", checkOut: "2026-10-22" })], s, false, NOW), { state: "not_open", opensOn: "2026-10-17" });
  });
  it("is closed for unpaid bookings and after check-out, and done once submitted", () => {
    assert.equal(checkinState([res({ status: "pending" })], s, false, NOW).state, "closed");
    assert.equal(checkinState([res({ checkIn: "2026-10-08", checkOut: "2026-10-10" })], s, false, NOW).state, "closed");
    assert.equal(checkinState([res({})], s, true, NOW).state, "done");
    assert.equal(checkinState([res({})], { ...s, enabled: false }, false, NOW).state, "disabled");
  });
});
