import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteStay } from "@/lib/booking-engine/quote";
import { DEFAULT_RATE_CONFIG } from "@/lib/booking-engine/rate-config";
import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";
import { buildHotelReport, reportToCsv } from "@/lib/reports/build";

const NOW = Date.parse("2026-10-20T12:00:00Z");

function res(over: Partial<ReservationRecord>): ReservationRecord {
  return {
    id: Math.random().toString(36).slice(2), firstName: "A", lastName: "B", email: "a@b.c", itemType: "room",
    roomId: "guest-room", guests: 2, stayPreference: "x", message: "x", status: "confirmed", source: "live",
    createdAt: "2026-10-01T09:00:00Z", emailSent: true, ...over,
  };
}

const quoted = (roomId: string, checkIn: string, checkOut: string, rooms = 1) => {
  const q = quoteStay({ roomId, checkIn, checkOut, guests: 2, rooms }, DEFAULT_RATE_CONFIG);
  assert.ok(q.ok);
  return { roomId, checkIn, checkOut, nights: q.nights, units: rooms, quotedTotalNgn: q.totalNgn, quoteSnapshot: q };
};

const inventory = { "guest-room": 2, "executive-room": 1, "signature-suite": 1, "presidential-suite": 1 }; // 5 rooms

describe("hotel report", () => {
  const reservations = [
    // 3 nights, 10–13 Oct; only 10–11 fall inside the 10–11 report.
    res({ ...quoted("guest-room", "2026-10-10", "2026-10-13"), bookingChannel: "online" }),
    // 2 rooms × 1 night on 11 Oct, made at the desk.
    res({ ...quoted("guest-room", "2026-10-11", "2026-10-12", 2), guests: 3, message: "Walk-in booking (recorded by staff)" }),
    // Cancelled: ignored for occupancy, counted as a cancellation.
    res({ ...quoted("signature-suite", "2026-10-10", "2026-10-12"), status: "cancelled", createdAt: "2026-10-10T08:00:00Z" }),
    // Pending with a lapsed hold: not booked.
    res({ ...quoted("executive-room", "2026-10-10", "2026-10-11"), status: "pending", holdExpiresAt: "2026-10-09T00:00:00Z" }),
  ];
  const payments: PaymentRecord[] = [
    { id: "p1", reference: "R1", email: "a", amountKobo: 5_700_000, currency: "NGN", status: "success", itemType: "room", itemId: "x", itemLabel: "x", paymentMethod: "paystack", source: "live", createdAt: "2026-10-10T10:00:00Z" },
    { id: "p2", reference: "RF1", email: "a", amountKobo: -1_000_000, currency: "NGN", status: "success", itemType: "room", itemId: "x", itemLabel: "x", paymentMethod: "paystack", source: "live", createdAt: "2026-10-11T10:00:00Z" },
    { id: "p3", reference: "R2", email: "a", amountKobo: 900_000, currency: "NGN", status: "failed", itemType: "room", itemId: "x", itemLabel: "x", paymentMethod: "cash", source: "live", createdAt: "2026-10-11T10:00:00Z" },
  ];
  const blocks = [{ id: "b1", roomId: "presidential-suite", checkIn: "2026-10-11", checkOut: "2026-10-12", blockType: "maintenance" as const, createdAt: "x" }];

  const report = buildHotelReport({ from: "2026-10-10", to: "2026-10-11", reservations, payments, blocks, inventory, now: NOW });

  it("counts room-nights inside the range only, against inventory minus blocks", () => {
    // Sold: stay 1 → 2 nights; stay 2 → 2 rooms × 1 night = 4. Available: 5 × 2 − 1 blocked = 9.
    assert.equal(report.occupancy.roomNightsSold, 4);
    assert.equal(report.occupancy.roomNightsAvailable, 9);
    assert.equal(report.occupancy.occupancyPct, 44.4);
    assert.equal(report.occupancy.guestNights, 2 * 2 + 3);
    assert.deepEqual(report.daily.map((d) => [d.occupiedRooms, d.availableRooms, d.blockedRooms]), [[1, 5, 0], [3, 4, 1]]);
  });

  it("computes revenue, ADR and RevPAR from the booked nightly rates", () => {
    // Guest room weekday rate 95,000: 2 + 2 room-nights in range.
    assert.equal(report.keyMetrics.roomRevenueNgn, 4 * 95_000);
    assert.equal(report.keyMetrics.adrNgn, 95_000);
    assert.equal(report.keyMetrics.revparNgn, Math.round((4 * 95_000) / 9));
    assert.equal(report.byRoomType.find((r) => r.roomId === "guest-room")?.roomNights, 4);
  });

  it("summarises bookings made, channels, cancellations and money received", () => {
    assert.equal(report.bookingsCreated.count, 1, "only the cancelled one was made inside the range");
    assert.equal(report.bookingsCreated.cancelled, 1);
    const wide = buildHotelReport({ from: "2026-10-01", to: "2026-10-11", reservations, payments, blocks, inventory, now: NOW });
    assert.equal(wide.bookingsCreated.online, 3);
    assert.equal(wide.bookingsCreated.desk, 1, "walk-in inferred from its note");
    assert.deepEqual(report.paymentsByMethod, [
      { method: "paystack", amountNgn: 57_000, count: 1 },
      { method: "refund", amountNgn: -10_000, count: 1 },
    ]);
  });

  it("exports CSV with a summary and one row per day", () => {
    const csv = reportToCsv(report);
    assert.match(csv, /^Relief Hotels report,2026-10-10 to 2026-10-11/);
    assert.match(csv, /\n2026-10-11,3,4,1,5\n$/);
  });
});
