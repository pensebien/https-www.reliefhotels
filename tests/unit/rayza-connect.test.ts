import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReservationRecord } from "@/lib/demo-store";
import {
  bookingReferenceFor,
  parseRayzaErrorBody,
  rayzaRoomIdentifier,
} from "@/lib/integrations/rayza-connect";

function makeReservation(
  overrides: Partial<ReservationRecord> = {},
): ReservationRecord {
  return {
    id: "11112222-3333-4444-5555-666677778888",
    firstName: "Ada",
    lastName: "Okonkwo",
    email: "ada@example.com",
    itemType: "room",
    guests: 2,
    stayPreference: "signature-suite",
    message: "",
    status: "pending",
    source: "live",
    createdAt: new Date().toISOString(),
    emailSent: false,
    ...overrides,
  };
}

describe("rayza-connect", () => {
  it("resolves a known Relief room id as the RAYZA identifier", () => {
    assert.equal(rayzaRoomIdentifier("signature-suite"), "signature-suite");
    assert.equal(rayzaRoomIdentifier("guest-room"), "guest-room");
  });

  it("returns undefined for an unmapped or missing room id", () => {
    assert.equal(rayzaRoomIdentifier("not-a-real-room"), undefined);
    assert.equal(rayzaRoomIdentifier(undefined), undefined);
  });

  it("uses the payment reference as the booking reference when present", () => {
    const record = makeReservation({ paymentReference: "RH-PAY-20260812-abc" });
    assert.equal(bookingReferenceFor(record), "RH-PAY-20260812-abc");
  });

  it("falls back to a derived reference when there is no payment reference", () => {
    const record = makeReservation({ paymentReference: undefined });
    assert.equal(bookingReferenceFor(record), "RH-11112222");
  });

  it("unwraps a FastAPI string detail error", () => {
    assert.equal(
      parseRayzaErrorBody('{"detail":"Booking reference not found"}', "fallback"),
      "Booking reference not found",
    );
  });

  it("unwraps a FastAPI validation-error list", () => {
    assert.equal(
      parseRayzaErrorBody(
        '{"detail":[{"type":"missing","loc":["body","guest_name"],"msg":"Field required"}]}',
        "fallback",
      ),
      "Field required",
    );
  });

  it("falls back to the raw body or fallback string when not JSON", () => {
    assert.equal(parseRayzaErrorBody("Internal Server Error", "fallback"), "Internal Server Error");
    assert.equal(parseRayzaErrorBody("", "fallback"), "fallback");
  });
});
