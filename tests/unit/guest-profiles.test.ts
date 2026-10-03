import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReservationRecord } from "@/lib/demo-store";
import { buildGuestSummaries } from "@/lib/guests/profiles";

const res = (over: Partial<ReservationRecord>): ReservationRecord => ({
  id: Math.random().toString(36).slice(2), firstName: "Ada", lastName: "Obi", email: "ada@example.com", itemType: "room",
  roomId: "guest-room", nights: 2, guests: 2, stayPreference: "x", message: "x", status: "confirmed", source: "live",
  createdAt: "2026-01-01T00:00:00Z", emailSent: true, ...over,
});

describe("guest summaries", () => {
  const guests = buildGuestSummaries(
    [
      res({ checkIn: "2026-03-01", quotedTotalNgn: 190_000, createdAt: "2026-02-01T00:00:00Z" }),
      res({ email: "ADA@example.com ", checkIn: "2026-11-01", quotedTotalNgn: 200_000, phone: "+234", createdAt: "2026-09-01T00:00:00Z", lastName: "Obi-Eze" }),
      res({ checkIn: "2026-05-01", status: "cancelled", quotedTotalNgn: 999_999 }),
      res({ email: "chidi@example.com", firstName: "Chidi", checkIn: "2026-04-01", quotedTotalNgn: 95_000 }),
    ],
    [{ email: "chidi@example.com", tags: ["VIP"], company: "Acme", notes: "", blocked: true, updatedAt: "x" }],
    "2026-10-01",
  );
  it("groups by email case-insensitively and ignores cancelled stays in totals", () => {
    const ada = guests.find((g) => g.email === "ada@example.com")!;
    assert.equal(ada.stays, 2);
    assert.equal(ada.valueNgn, 390_000);
    assert.equal(ada.returning, true);
    assert.equal(ada.name, "Ada Obi-Eze", "latest booking's name");
    assert.equal(ada.phone, "+234");
    assert.equal(ada.lastStay, "2026-03-01");
    assert.equal(ada.upcoming, "2026-11-01");
  });
  it("merges staff edits", () => {
    const chidi = guests.find((g) => g.email === "chidi@example.com")!;
    assert.deepEqual([chidi.tags, chidi.company, chidi.blocked, chidi.returning], [["VIP"], "Acme", true, false]);
  });
});
