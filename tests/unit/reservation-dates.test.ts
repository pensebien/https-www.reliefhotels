import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatYmd,
  reservationInDateRange,
  resolveDateRange,
  stayOverlapsRange,
} from "@/lib/reservation-dates";

describe("reservation date range", () => {
  it("detects stay overlap with range", () => {
    assert.equal(
      stayOverlapsRange("2026-06-10", "2026-06-12", {
        from: "2026-06-01",
        to: "2026-06-30",
      }),
      true,
    );
    assert.equal(
      stayOverlapsRange("2026-07-01", "2026-07-03", {
        from: "2026-06-01",
        to: "2026-06-30",
      }),
      false,
    );
  });

  it("resolves upcoming range from a fixed date", () => {
    const range = resolveDateRange("upcoming", undefined, new Date(2026, 5, 19));
    assert.ok(range);
    assert.equal(range.from, "2026-06-19");
    assert.equal(range.to, "2027-06-19");
  });

  it("filters reservations by stay dates", () => {
    const range = { from: "2026-06-01", to: "2026-06-30" };
    assert.equal(
      reservationInDateRange(
        {
          checkIn: "2026-06-02",
          checkOut: "2026-06-05",
          createdAt: "2026-05-01T00:00:00.000Z",
          itemType: "room",
        },
        range,
      ),
      true,
    );
    assert.equal(
      reservationInDateRange(
        {
          createdAt: "2026-06-15T00:00:00.000Z",
          itemType: "tour",
        },
        range,
      ),
      true,
    );
  });

  it("formats ymd", () => {
    assert.equal(formatYmd(new Date(2026, 5, 9)), "2026-06-09");
  });
});
