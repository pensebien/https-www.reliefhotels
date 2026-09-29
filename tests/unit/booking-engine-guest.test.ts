import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGuestBookingView } from "@/lib/booking-engine/guest-booking";
import { isValidManageToken, signReservationId } from "@/lib/booking-engine/manage-link";
import {
  DEFAULT_RATE_CONFIG,
  normalizeRateConfig,
  rateConfigSchema,
} from "@/lib/booking-engine/rate-config";
import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";

const policy = { allowGuestCancel: true, freeCancelHoursBefore: 48, refundPctWithinWindow: 100 };

const reservation: ReservationRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  firstName: "Ada",
  lastName: "Obi",
  email: "ada@example.com",
  itemType: "room",
  roomId: "guest-room",
  checkIn: "2026-10-10",
  checkOut: "2026-10-12",
  nights: 2,
  guests: 2,
  stayPreference: "guest-room",
  message: "-",
  status: "confirmed",
  source: "live",
  createdAt: "2026-09-01T00:00:00.000Z",
  emailSent: true,
  quotedTotalNgn: 190_000,
  quotedDepositNgn: 38_000,
};

const deposit: PaymentRecord = {
  id: "p1",
  reference: "RH-1",
  reservationId: reservation.id,
  email: reservation.email,
  amountKobo: 3_800_000,
  currency: "NGN",
  status: "success",
  itemType: "room",
  itemId: "guest-room",
  itemLabel: "deposit",
  source: "live",
  createdAt: "2026-09-01T00:05:00.000Z",
};

describe("buildGuestBookingView", () => {
  it("offers the balance and a full refund inside the free-cancellation window", () => {
    const view = buildGuestBookingView(reservation, [deposit], policy, 20, new Date("2026-10-01T12:00:00Z"));
    assert.equal(view.paidNgn, 38_000);
    assert.equal(view.amountDueKind, "balance");
    assert.equal(view.amountDueNgn, 152_000);
    assert.equal(view.canCancel, true);
    assert.equal(view.refundIfCancelledNgn, 38_000);
    // 14:00 WAT on 10 Oct minus 48h.
    assert.equal(view.freeCancelUntil, "2026-10-08T13:00:00.000Z");
  });

  it("still allows cancelling after the window but refunds nothing", () => {
    const view = buildGuestBookingView(reservation, [deposit], policy, 20, new Date("2026-10-09T12:00:00Z"));
    assert.equal(view.canCancel, true);
    assert.equal(view.refundIfCancelledNgn, 0);
  });

  it("blocks cancelling once the stay has started, and when the policy disallows it", () => {
    assert.equal(
      buildGuestBookingView(reservation, [deposit], policy, 20, new Date("2026-10-10T14:00:00Z")).canCancel,
      false,
    );
    assert.equal(
      buildGuestBookingView(reservation, [deposit], { ...policy, allowGuestCancel: false }, 20, new Date("2026-10-01T00:00:00Z")).canCancel,
      false,
    );
  });

  it("asks an unpaid pending booking for its deposit until the hold lapses", () => {
    const pending = { ...reservation, status: "pending" as const, holdExpiresAt: "2026-10-01T13:00:00.000Z" };
    const live = buildGuestBookingView(pending, [], policy, 20, new Date("2026-10-01T12:00:00Z"));
    assert.equal(live.amountDueKind, "deposit");
    assert.equal(live.amountDueNgn, 38_000);

    const lapsed = buildGuestBookingView(pending, [], policy, 20, new Date("2026-10-01T13:30:00Z"));
    assert.equal(lapsed.amountDueKind, null);
  });

  it("ignores failed payments and falls back to catalog price for legacy bookings", () => {
    const legacy = { ...reservation, quotedTotalNgn: undefined, quotedDepositNgn: undefined };
    const view = buildGuestBookingView(legacy, [{ ...deposit, status: "failed" }], policy, 20, new Date("2026-10-01T00:00:00Z"));
    assert.equal(view.totalNgn, 190_000);
    assert.equal(view.depositNgn, 38_000);
    assert.equal(view.paidNgn, 0);
  });
});

describe("manage-link tokens", () => {
  it("accepts only the token signed for that reservation", () => {
    const token = signReservationId(reservation.id);
    assert.equal(isValidManageToken(reservation.id, token), true);
    assert.equal(isValidManageToken("22222222-2222-4222-8222-222222222222", token), false);
    assert.equal(isValidManageToken(reservation.id, `${token.slice(0, -1)}x`), false);
    assert.equal(isValidManageToken(reservation.id, null), false);
  });
});

describe("normalizeRateConfig", () => {
  it("fills missing rooms and new fields from defaults", () => {
    const config = normalizeRateConfig({
      rooms: [{ ...DEFAULT_RATE_CONFIG.rooms[0], baseNightlyNgn: 99_000 }],
      depositPct: 30,
    });
    assert.equal(config.rooms.length, DEFAULT_RATE_CONFIG.rooms.length);
    assert.equal(config.rooms[0].baseNightlyNgn, 99_000);
    assert.equal(config.depositPct, 30);
    assert.deepEqual(config.cancellation, DEFAULT_RATE_CONFIG.cancellation);
  });

  it("falls back to defaults for an invalid stored document", () => {
    assert.deepEqual(normalizeRateConfig({ depositPct: 500 }), DEFAULT_RATE_CONFIG);
    assert.deepEqual(normalizeRateConfig(null), DEFAULT_RATE_CONFIG);
  });

  it("uppercases coupon codes and rejects seasons that end before they start", () => {
    const parsed = rateConfigSchema.parse({
      ...DEFAULT_RATE_CONFIG,
      coupons: [{ code: "summer10", pct: 10 }],
    });
    assert.equal(parsed.coupons[0].code, "SUMMER10");
    assert.equal(
      rateConfigSchema.safeParse({
        ...DEFAULT_RATE_CONFIG,
        seasons: [{ id: "x", label: "x", from: "2026-12-10", to: "2026-12-01" }],
      }).success,
      false,
    );
  });
});
