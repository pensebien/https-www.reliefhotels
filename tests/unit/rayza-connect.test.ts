import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReservationRecord } from "@/lib/demo-store";
import {
  buildBookingBodies,
  legacyRayzaReference,
  parseCatalogue,
  parseRayzaError,
  rayzaReferences,
  splitEvenly,
} from "@/lib/integrations/rayza-connect";
import { rayzaChecksFrom } from "@/lib/integrations/rayza-sync";

function makeReservation(overrides: Partial<ReservationRecord> = {}): ReservationRecord {
  return {
    id: "11112222-3333-4444-5555-666677778888",
    firstName: "Ada",
    lastName: "Okonkwo",
    email: "ada@example.com",
    phone: "+2348012345678",
    itemType: "room",
    roomId: "guest-room",
    checkIn: "2026-11-20",
    checkOut: "2026-11-22",
    guests: 2,
    stayPreference: "x",
    message: "",
    status: "confirmed",
    source: "live",
    createdAt: new Date().toISOString(),
    emailSent: false,
    quotedTotalNgn: 190_000,
    ...overrides,
  };
}

// Shape copied from the live sandbox's GET /v1/rooms (v4.2.0).
const SANDBOX_ROOMS = {
  currency: "NGN",
  tax_display_mode: "exclusive",
  rooms: [
    {
      room_type_identifier: "standard-deluxe",
      room_type_name: "Standard Deluxe",
      room_numbers: ["310", "312", "314"],
      total_rooms: 6,
      available_count: 3,
      available: true,
      base_price: 46000.0,
      tax_exclusive_price: 46000.0,
      tax_inclusive_price: 49450.0,
      min_los: 2,
      capacity: { base_occupancy: 1, max_occupancy: 3 },
      closed_to_arrival: false,
      closed_to_departure: false,
    },
    {
      room_type_identifier: "emperical-suites",
      room_type_name: "Emperical Suites",
      room_numbers: [],
      total_rooms: 3,
      available_count: 0,
      available: false,
      base_price: 80000.0,
      min_los: 1,
      capacity: { max_occupancy: 2 },
      closed_to_arrival: true,
    },
  ],
};

describe("rayza-connect", () => {
  it("reads v4.2 error bodies and the older FastAPI shapes", () => {
    assert.deepEqual(
      parseRayzaError(
        '{"status":"rejected","error":{"code":"ROOM_UNAVAILABLE","message":"The selected room is no longer available."}}',
        "fallback",
      ),
      { code: "ROOM_UNAVAILABLE", message: "The selected room is no longer available." },
    );
    assert.deepEqual(parseRayzaError('{"detail":"Booking reference not found"}', "f"), { message: "Booking reference not found" });
    assert.deepEqual(parseRayzaError('{"detail":[{"msg":"Field required"}]}', "f"), {
      code: "VALIDATION_ERROR",
      message: "Field required",
    });
    assert.deepEqual(parseRayzaError("Internal Server Error", "f"), { message: "Internal Server Error" });
    assert.deepEqual(parseRayzaError("", "fallback"), { message: "fallback" });
  });

  it("makes references RAYZA keeps as sent: BK- prefixed, stable, one per room", () => {
    assert.deepEqual(rayzaReferences(makeReservation()), ["BK-RH-111122223333"]);
    assert.deepEqual(rayzaReferences(makeReservation({ units: 2 })), ["BK-RH-111122223333-1", "BK-RH-111122223333-2"]);
    for (const ref of rayzaReferences(makeReservation({ units: 3 }))) assert.match(ref, /^BK-/);
  });

  it("predicts what RAYZA stored for pre-v4.2 references", () => {
    assert.equal(legacyRayzaReference(makeReservation({ paymentReference: undefined })), "BK-11112222");
    assert.equal(legacyRayzaReference(makeReservation({ paymentReference: "RH-AB12CD34" })), "BK-AB12CD34");
    assert.equal(legacyRayzaReference(makeReservation({ paymentReference: "PSK_abc123" })), "BK-PSK_abc123");
  });

  it("splits whole amounts so the parts add back up", () => {
    assert.deepEqual(splitEvenly(100, 3), [34, 33, 33]);
    assert.deepEqual(splitEvenly(5, 1), [5]);
    assert.equal(splitEvenly(190_001, 2).reduce((a, b) => a + b), 190_001);
  });

  it("builds one booking per room with amount, deposit, adults and room numbers", () => {
    const record = makeReservation({ units: 2, guests: 3, quotedTotalNgn: 200_000, paymentReference: "PAY-1" });
    const bodies = buildBookingBodies(record, { roomType: "standard-deluxe", roomNumbers: ["310"], paidNgn: 50_000, isTest: true });
    assert.equal(bodies.length, 2);
    assert.deepEqual(
      bodies.map((b) => [b.booking_reference, b.room_identifier, b.room_number, b.adults, b.amount, b.deposit_paid, b.payment_status]),
      [
        ["BK-RH-111122223333-1", "standard-deluxe", "310", 2, 100_000, 25_000, "partial"],
        ["BK-RH-111122223333-2", "standard-deluxe", undefined, 1, 100_000, 25_000, "partial"],
      ],
    );
    assert.equal(bodies[0].currency, "NGN");
    assert.equal(bodies[0].guest_phone, "+2348012345678");
    assert.equal(bodies[0].payment_reference, "PAY-1");
    assert.equal(bodies[0].is_test, true);

    const [full] = buildBookingBodies(makeReservation(), { roomType: "x", roomNumbers: [], paidNgn: 190_000, isTest: false });
    assert.equal(full.payment_status, "paid");
    const [none] = buildBookingBodies(makeReservation(), { roomType: "x", roomNumbers: [], paidNgn: 0, isTest: false });
    assert.equal(none.payment_status, "unpaid");
    assert.equal(none.amount, 190_000, "amount is always sent (RAYZA requires it)");
  });

  it("parses the room catalogue", () => {
    const cat = parseCatalogue(SANDBOX_ROOMS)!;
    assert.equal(cat.currency, "NGN");
    assert.deepEqual(cat.rooms[0], {
      id: "standard-deluxe",
      name: "Standard Deluxe",
      roomNumbers: ["310", "312", "314"],
      totalRooms: 6,
      availableCount: 3,
      priceNgn: 46000,
      priceWithTaxNgn: 49450,
      minLos: 2,
      maxOccupancy: 3,
      closedToArrival: false,
      closedToDeparture: false,
    });
    assert.equal(parseCatalogue({ detail: "nope" }), null);
  });

  it("turns RAYZA's catalogue into per-room availability with its stay rules", () => {
    const cat = parseCatalogue(SANDBOX_ROOMS)!;
    const links = { "guest-room": "standard-deluxe", "executive-room": "emperical-suites", "signature-suite": "gone" };
    const two = rayzaChecksFrom(cat, links, 2);
    assert.deepEqual(two["guest-room"], { free: 3, maxOccupancy: 3, nightlyNgn: 49450 }, "priced tax-inclusive");
    assert.equal(two["executive-room"].free, 0);
    assert.match(two["executive-room"].reason!, /Arrivals are closed/);
    assert.equal(two["signature-suite"].free, 0);
    assert.match(two["signature-suite"].reason!, /no longer has/);
    assert.equal(two["presidential-suite"], undefined, "unlinked rooms aren't sold online");
    const one = rayzaChecksFrom(cat, links, 1);
    assert.match(one["guest-room"].reason!, /Minimum stay is 2/);
  });
});
