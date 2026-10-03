import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGuestBookingView } from "@/lib/booking-engine/guest-booking";
import { quoteStay } from "@/lib/booking-engine/quote";
import { DEFAULT_RATE_CONFIG, rateConfigSchema, type RateConfig } from "@/lib/booking-engine/rate-config";
import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";

const base: RateConfig = {
  ...DEFAULT_RATE_CONFIG,
  rooms: DEFAULT_RATE_CONFIG.rooms.map((r) => (r.roomId === "guest-room" ? { ...r, baseNightlyNgn: 100_000 } : r)),
};
const q = (over: Partial<Parameters<typeof quoteStay>[0]>, config: RateConfig = base) =>
  quoteStay({ roomId: "guest-room", checkIn: "2026-10-05", checkOut: "2026-10-07", guests: 2, ...over }, config);
const code = (r: ReturnType<typeof quoteStay>) => (r.ok ? "ok" : r.code);

// 2026-10-05 is a Monday; 2026-10-09 a Friday; 2026-10-11 a Sunday.
describe("weekday seasons", () => {
  it("price only the chosen weekdays", () => {
    const config = { ...base, seasons: [{ id: "wk", label: "Weekend", from: "2026-10-01", to: "2026-11-01", nightlyNgn: 150_000, weekdays: [5, 6] }] };
    const r = q({ checkIn: "2026-10-08", checkOut: "2026-10-11" }, config); // Thu, Fri, Sat
    assert.ok(r.ok);
    assert.deepEqual(r.perNight.map((n) => n.nightlyNgn), [100_000, 150_000, 150_000]);
  });
});

describe("restrictions", () => {
  const config = (mode: "no_arrival" | "no_departure" | "closed", weekdays?: number[]): RateConfig => ({
    ...base,
    restrictions: [{ id: "r", label: "Event", from: "2026-10-01", to: "2026-11-01", mode, weekdays }],
  });
  it("blocks arrivals on chosen weekdays only", () => {
    assert.equal(code(q({ checkIn: "2026-10-11", checkOut: "2026-10-13" }, config("no_arrival", [0]))), "closed_to_arrival");
    assert.equal(code(q({}, config("no_arrival", [0]))), "ok");
  });
  it("blocks departures and closed nights", () => {
    assert.equal(code(q({ checkOut: "2026-10-11" }, config("no_departure", [0]))), "closed_to_departure");
    assert.equal(code(q({ checkIn: "2026-10-09", checkOut: "2026-10-12" }, config("closed", [6]))), "closed");
    assert.equal(code(q({}, config("closed", [6]))), "ok", "Mon–Wed stay doesn't touch a Saturday");
  });
  it("applies only to the listed room types and can be overridden by staff", () => {
    const suiteOnly: RateConfig = { ...base, restrictions: [{ id: "r", label: "x", from: "2026-10-01", to: "2026-11-01", mode: "closed", roomIds: ["signature-suite"] }] };
    assert.equal(code(q({}, suiteOnly)), "ok");
    assert.equal(code(q({ ignoreRestrictions: true }, config("closed"))), "ok");
  });
});

describe("stay rules", () => {
  it("require minimum nights for arrivals on chosen weekdays", () => {
    const config: RateConfig = { ...base, stayRules: [{ id: "s", label: "Fri 2+", minNights: 2, checkInWeekdays: [5] }] };
    assert.equal(code(q({ checkIn: "2026-10-09", checkOut: "2026-10-10" }, config)), "min_stay");
    assert.equal(code(q({ checkIn: "2026-10-09", checkOut: "2026-10-11" }, config)), "ok");
    assert.equal(code(q({ checkIn: "2026-10-08", checkOut: "2026-10-09" }, config)), "ok", "Thursday arrival unaffected");
  });
  it("cap the stay and enforce whole weeks", () => {
    const config: RateConfig = { ...base, stayRules: [{ id: "w", label: "Weekly", minNights: 7, maxNights: 14, wholeWeeks: true }] };
    assert.equal(code(q({ checkOut: "2026-10-15" }, config)), "stay_length"); // 10 nights
    assert.equal(code(q({ checkOut: "2026-10-12" }, config)), "ok"); // 7 nights
    assert.equal(code(q({ checkOut: "2026-10-26" }, config)), "max_stay"); // 21 nights
  });
});

describe("rate plans", () => {
  const config: RateConfig = {
    ...base,
    ratePlans: [{ id: "nonref", label: "Non-refundable", description: "", adjustPct: -10, refundable: false, depositPct: 100, active: true }],
  };
  it("adjust the nightly rate and deposit, and validate the plan", () => {
    const r = q({ ratePlanId: "nonref" }, config);
    assert.ok(r.ok);
    assert.equal(r.totalNgn, 180_000);
    assert.equal(r.depositNgn, 180_000, "paid in full");
    assert.deepEqual(r.ratePlan, { id: "nonref", label: "Non-refundable", refundable: false });
    assert.equal(code(q({ ratePlanId: "nope" }, config)), "invalid_rate_plan");
    const standard = q({}, config);
    assert.ok(standard.ok);
    assert.equal(standard.totalNgn, 200_000, "the flexible rate is unchanged");
  });
  it("refund nothing on cancellation for non-refundable stays", () => {
    const quote = q({ ratePlanId: "nonref", checkIn: "2026-12-10", checkOut: "2026-12-12" }, config);
    assert.ok(quote.ok);
    const reservation = {
      id: "r", firstName: "A", lastName: "B", email: "a@b.c", itemType: "room", roomId: "guest-room",
      checkIn: "2026-12-10", checkOut: "2026-12-12", nights: 2, guests: 2, stayPreference: "x", message: "x",
      status: "confirmed", source: "live", createdAt: "2026-10-01T00:00:00Z", emailSent: true,
      quotedTotalNgn: quote.totalNgn, quotedDepositNgn: quote.depositNgn, quoteSnapshot: quote,
    } as ReservationRecord;
    const paid = { id: "p", reference: "R", reservationId: "r", email: "a", amountKobo: quote.depositNgn * 100, currency: "NGN", status: "success", itemType: "room", itemId: "x", itemLabel: "x", source: "live", createdAt: "2026-10-01T00:00:00Z" } as PaymentRecord;
    const view = buildGuestBookingView(reservation, [paid], DEFAULT_RATE_CONFIG.cancellation, 20, new Date("2026-10-02T00:00:00Z"));
    assert.equal(view.canCancel, true);
    assert.equal(view.refundable, false);
    assert.equal(view.refundIfCancelledNgn, 0);
  });
});

describe("extras", () => {
  it("price per room / per room-night and add always-included extras", () => {
    const config: RateConfig = {
      ...base,
      extras: [
        { id: "levy", label: "City levy", priceNgn: 1_000, pricing: "per_room_night", active: true, included: true },
        { id: "welcome", label: "Welcome pack", priceNgn: 5_000, pricing: "per_room", active: true },
      ],
    };
    const r = q({ rooms: 2, guests: 3, extraIds: ["welcome"] }, config);
    assert.ok(r.ok);
    assert.deepEqual(r.extras.map((e) => [e.id, e.totalNgn]), [["levy", 4_000], ["welcome", 10_000]]);
  });
  it("defaults stay valid with the new lists", () => {
    assert.equal(rateConfigSchema.safeParse(DEFAULT_RATE_CONFIG).success, true);
  });
});
