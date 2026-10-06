import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingsCsv, csvCell } from "@/lib/booking-export";
import { bookingPaymentStatus, collectedNgn } from "@/lib/booking-payment-status";
import { applyRateCalendarEdit } from "@/lib/booking-engine/rate-calendar";
import { dayRate, quoteStay } from "@/lib/booking-engine/quote";
import { DEFAULT_RATE_CONFIG, rateConfigSchema, type RateConfig } from "@/lib/booking-engine/rate-config";
import type { ReservationRecord } from "@/lib/demo-store";

const base: RateConfig = {
  ...DEFAULT_RATE_CONFIG,
  rooms: DEFAULT_RATE_CONFIG.rooms.map((r) => (r.roomId === "guest-room" ? { ...r, baseNightlyNgn: 100_000, weekendUpliftNgn: 0 } : r)),
};
const q = (over: Partial<Parameters<typeof quoteStay>[0]>, config: RateConfig = base) =>
  quoteStay({ roomId: "guest-room", checkIn: "2026-11-02", checkOut: "2026-11-04", guests: 2, ...over }, config);
const paid = (naira: number, status = "success") => ({ status, amountKobo: naira * 100 });

describe("booking payment status", () => {
  it("compares what was collected (less refunds) with the booking's price", () => {
    const r = { quotedTotalNgn: 200_000 };
    assert.equal(bookingPaymentStatus(r, []), "unpaid");
    assert.equal(bookingPaymentStatus(r, [paid(40_000), paid(10_000, "failed")]), "partial");
    assert.equal(bookingPaymentStatus(r, [paid(200_000)]), "paid");
    assert.equal(bookingPaymentStatus(r, [paid(250_000)]), "overpaid");
    assert.equal(bookingPaymentStatus(r, [paid(250_000), paid(-50_000)]), "paid", "refund rows are negative");
    assert.equal(bookingPaymentStatus({}, [paid(5_000)]), "paid", "no locked price: any payment counts");
    assert.equal(collectedNgn([paid(100), paid(-30), paid(50, "pending")]), 70);
  });
});

describe("bookings CSV", () => {
  it("quotes cells and neutralises spreadsheet formulas", () => {
    assert.equal(csvCell('He said "hi", twice'), '"He said ""hi"", twice"');
    assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
    assert.equal(csvCell(-5), "-5", "numbers stay numbers");
    assert.equal(csvCell(undefined), "");
    const csv = bookingsCsv([
      {
        id: "r1", firstName: "Ada", lastName: "O", email: "a@b.c", itemType: "room", guests: 2, stayPreference: "",
        message: "", status: "confirmed", source: "live", createdAt: "2026-10-01T00:00:00Z", emailSent: true,
        tags: ["VIP", "late"], paidNgn: 1000, paymentStatus: "partial",
      } as ReservationRecord & { paidNgn: number; paymentStatus: "partial" },
    ]);
    const [header, row] = csv.trim().split("\r\n");
    assert.match(header, /^Booking,Status,Guest/);
    assert.match(row, /^r1,confirmed,Ada O,/);
    assert.match(row, /VIP; late/);
  });
});

describe("rate calendar", () => {
  it("describes a night: price, season, rules", () => {
    const config: RateConfig = {
      ...base,
      seasons: [{ id: "s", label: "Carnival", from: "2026-12-20", to: "2026-12-31", nightlyNgn: 150_000, minNights: 3 }],
      restrictions: [{ id: "r", label: "Event", from: "2026-12-24", to: "2026-12-26", mode: "no_arrival" }],
    };
    assert.deepEqual(dayRate(config, "guest-room", "2026-12-24"), {
      nightlyNgn: 150_000, seasonLabel: "Carnival", closed: false, noArrival: true, noDeparture: false, minNights: 3,
    });
    assert.equal(dayRate(config, "guest-room", "2026-11-02")?.nightlyNgn, 100_000);
    assert.equal(dayRate(config, "nope", "2026-11-02"), null);
  });

  it("saves edits as seasons and restrictions the engine already understands", () => {
    let config = applyRateCalendarEdit(base, { roomId: "guest-room", from: "2026-11-02", to: "2026-11-04", nightlyNgn: 80_000 });
    config = applyRateCalendarEdit(config, { roomId: "guest-room", from: "2026-11-02", to: "2026-11-04", nightlyNgn: 90_000 });
    assert.equal(config.seasons.length, 1, "editing the same range replaces it");
    assert.ok(rateConfigSchema.safeParse(config).success);
    const quote = q({}, config);
    assert.ok(quote.ok);
    assert.equal(quote.totalNgn, 180_000);

    config = applyRateCalendarEdit(config, { roomId: "guest-room", from: "2026-11-03", to: "2026-11-04", closed: true });
    assert.equal(dayRate(config, "guest-room", "2026-11-03")?.closed, true);
    assert.equal(dayRate(config, "executive-room", "2026-11-03")?.closed, false, "only that room type");
    const closed = q({}, config);
    assert.equal(closed.ok ? "ok" : closed.code, "closed");
    config = applyRateCalendarEdit(config, { roomId: "guest-room", from: "2026-11-03", to: "2026-11-04", closed: false });
    assert.equal(config.restrictions.length, 0, "reopen removes the stop sale");
  });
});

describe("coupons", () => {
  const withExtra = (coupon: Record<string, unknown>): RateConfig => ({
    ...base,
    extras: [{ id: "breakfast", label: "Breakfast", priceNgn: 10_000, pricing: "per_stay", active: true }],
    coupons: [{ code: "DEAL", active: true, ...coupon }],
  });

  it("discount rooms by default, or extras, or both", () => {
    const run = (coupon: Record<string, unknown>) => {
      const r = q({ couponCode: "DEAL", extraIds: ["breakfast"] }, withExtra(coupon));
      assert.ok(r.ok);
      return r.couponDiscountNgn;
    };
    assert.equal(run({ pct: 50 }), 100_000);
    assert.equal(run({ pct: 50, appliesTo: "extras" }), 5_000);
    assert.equal(run({ pct: 50, appliesTo: "both" }), 105_000);
    assert.equal(run({ amountNgn: 50_000, appliesTo: "extras" }), 10_000, "never more than the extras");
  });

  it("can skip the online deposit (pay at hotel)", () => {
    const r = q({ couponCode: "DEAL" }, withExtra({ skipDeposit: true }));
    assert.ok(r.ok);
    assert.deepEqual([r.depositNgn, r.depositPct, r.totalNgn], [0, 0, 200_000]);
    assert.ok(rateConfigSchema.safeParse(withExtra({ skipDeposit: true })).success, "skip deposit alone is a valid coupon");
  });
});

describe("analytics IDs", () => {
  const engine = (analytics: Record<string, string>) =>
    rateConfigSchema.safeParse({ ...base, engine: { ...base.engine, analytics } }).success;
  it("accepts real-looking IDs only", () => {
    assert.equal(engine({ gaMeasurementId: "G-AB12CD34", metaPixelId: "123456789012" }), true);
    assert.equal(engine({ gaMeasurementId: "UA-1234-1" }), false);
    assert.equal(engine({ metaPixelId: "12ab" }), false);
    assert.equal(engine({ gaMeasurementId: "G-1234');alert(1)//" }), false, "nothing that could break out of the script");
  });
});
