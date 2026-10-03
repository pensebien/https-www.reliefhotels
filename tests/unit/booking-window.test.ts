import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingWindowError } from "@/lib/booking-engine/booking-window";
import { DEFAULT_RATE_CONFIG } from "@/lib/booking-engine/rate-config";

// 2026-10-10 17:30 in Calabar (16:30 UTC).
const NOW = Date.parse("2026-10-10T16:30:00Z");
const engine = { ...DEFAULT_RATE_CONFIG.engine, minDaysAhead: 0, maxDaysAhead: 90, sameDayCutoff: "18:00" };

describe("booking window", () => {
  it("rejects the past and dates beyond the furthest day", () => {
    assert.match(bookingWindowError("2026-10-09", engine, NOW) ?? "", /past/);
    assert.match(bookingWindowError("2027-01-10", engine, NOW) ?? "", /90 days ahead/);
    assert.equal(bookingWindowError("2027-01-08", engine, NOW), null);
  });
  it("enforces notice and the same-day cut-off in Calabar time", () => {
    assert.equal(bookingWindowError("2026-10-10", engine, NOW), null, "before 18:00");
    assert.match(bookingWindowError("2026-10-10", engine, Date.parse("2026-10-10T17:05:00Z")) ?? "", /close at 18:00/);
    assert.match(bookingWindowError("2026-10-11", { ...engine, minDaysAhead: 2 }, NOW) ?? "", /2 day\(s\) notice/);
  });
});
