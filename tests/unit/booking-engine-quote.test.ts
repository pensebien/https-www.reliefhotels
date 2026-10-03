import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteStay } from "@/lib/booking-engine/quote";
import {
  DEFAULT_RATE_CONFIG,
  type RateConfig,
} from "@/lib/booking-engine/rate-config";

const base: RateConfig = {
  rooms: [
    {
      roomId: "guest-room",
      baseNightlyNgn: 100_000,
      weekendUpliftNgn: 20_000,
      maxGuestsPerUnit: 2,
      minNights: 1,
      maxNights: 30,
    },
  ],
  seasons: [],
  longStay: [],
  coupons: [],
  extras: [],
  restrictions: [],
  stayRules: [],
  ratePlans: [],
  engine: DEFAULT_RATE_CONFIG.engine,
  depositPct: 20,
  holdMinutes: 60,
  cancellation: { allowGuestCancel: true, freeCancelHoursBefore: 48, refundPctWithinWindow: 100 },
};

function ok(result: ReturnType<typeof quoteStay>) {
  assert.ok(result.ok, result.ok ? "" : result.message);
  return result;
}

describe("quoteStay", () => {
  it("default config matches the legacy priceFrom × nights and 20% deposit", () => {
    const q = ok(
      quoteStay(
        { roomId: "signature-suite", checkIn: "2026-10-05", checkOut: "2026-10-07", guests: 2 },
        DEFAULT_RATE_CONFIG,
      ),
    );
    assert.equal(q.totalNgn, 370_000);
    assert.equal(q.depositNgn, 74_000);
  });

  it("adds the weekend uplift on Friday and Saturday nights only", () => {
    // 2026-10-01 is a Thursday: Thu, Fri, Sat nights.
    const q = ok(
      quoteStay({ roomId: "guest-room", checkIn: "2026-10-01", checkOut: "2026-10-04", guests: 1 }, base),
    );
    assert.deepEqual(q.perNight.map((n) => n.nightlyNgn), [100_000, 120_000, 120_000]);
    assert.equal(q.totalNgn, 340_000);
  });

  it("layers seasons with the last matching rule winning and enforces its min stay", () => {
    const config: RateConfig = {
      ...base,
      rooms: [{ ...base.rooms[0], weekendUpliftNgn: 0 }],
      seasons: [
        { id: "dec", label: "December", from: "2026-12-01", to: "2027-01-01", adjustPct: 50 },
        { id: "carnival", label: "Carnival", from: "2026-12-26", to: "2026-12-28", nightlyNgn: 200_000, minNights: 3 },
      ],
    };
    const short = quoteStay({ roomId: "guest-room", checkIn: "2026-12-26", checkOut: "2026-12-28", guests: 1 }, config);
    assert.equal(short.ok, false);
    assert.equal(!short.ok && short.code, "min_stay");

    const q = ok(quoteStay({ roomId: "guest-room", checkIn: "2026-12-26", checkOut: "2026-12-29", guests: 1 }, config));
    assert.deepEqual(q.perNight.map((n) => n.nightlyNgn), [200_000, 200_000, 150_000]);
  });

  it("rejects closed-to-arrival dates and over-capacity parties", () => {
    const config: RateConfig = {
      ...base,
      seasons: [{ id: "x", label: "Sold out", from: "2026-11-10", to: "2026-11-11", closedToArrival: true }],
    };
    const closed = quoteStay({ roomId: "guest-room", checkIn: "2026-11-10", checkOut: "2026-11-12", guests: 1 }, config);
    assert.equal(!closed.ok && closed.code, "closed_to_arrival");

    const crowded = quoteStay({ roomId: "guest-room", checkIn: "2026-11-12", checkOut: "2026-11-13", guests: 3 }, base);
    assert.equal(!crowded.ok && crowded.code, "over_capacity");
    ok(quoteStay({ roomId: "guest-room", checkIn: "2026-11-12", checkOut: "2026-11-13", guests: 3, rooms: 2 }, base));
  });

  it("applies the best long-stay discount, then the coupon, then extras", () => {
    const config: RateConfig = {
      ...base,
      rooms: [{ ...base.rooms[0], weekendUpliftNgn: 0 }],
      longStay: [{ minNights: 3, pct: 5 }, { minNights: 7, pct: 10 }],
      coupons: [{ code: "RELIEF10", pct: 10 }],
      extras: [
        { id: "breakfast", label: "Breakfast", priceNgn: 5_000, pricing: "per_guest_night" },
        { id: "pickup", label: "Airport pickup", priceNgn: 25_000, pricing: "per_stay" },
      ],
    };
    const q = ok(
      quoteStay(
        {
          roomId: "guest-room",
          checkIn: "2026-10-05",
          checkOut: "2026-10-12",
          guests: 2,
          couponCode: "relief10",
          extraIds: ["breakfast", "pickup", "pickup"],
        },
        config,
      ),
    );
    assert.equal(q.roomSubtotalNgn, 700_000);
    assert.equal(q.longStayDiscountNgn, 70_000);
    assert.equal(q.couponDiscountNgn, 63_000);
    assert.equal(q.extrasTotalNgn, 70_000 + 25_000);
    assert.equal(q.totalNgn, 700_000 - 70_000 - 63_000 + 95_000);
    assert.equal(q.depositNgn, Math.round(q.totalNgn * 0.2));
  });

  it("lets a bypass coupon skip min stay but rejects unknown or expired codes", () => {
    const config: RateConfig = {
      ...base,
      rooms: [{ ...base.rooms[0], minNights: 2 }],
      coupons: [
        { code: "VIP", pct: 0, bypassMinStay: true },
        { code: "OLD", pct: 10, validTo: "2026-01-01" },
      ],
    };
    const input = { roomId: "guest-room", checkIn: "2026-10-05", checkOut: "2026-10-06", guests: 1 };
    assert.equal((quoteStay(input, config) as { code?: string }).code, "min_stay");
    ok(quoteStay({ ...input, couponCode: "VIP" }, config));
    assert.equal((quoteStay({ ...input, checkOut: "2026-10-08", couponCode: "OLD" }, config) as { code?: string }).code, "invalid_coupon");
    assert.equal((quoteStay({ ...input, checkOut: "2026-10-08", couponCode: "NOPE" }, config) as { code?: string }).code, "invalid_coupon");
  });
});
