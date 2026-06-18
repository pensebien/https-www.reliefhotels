import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reservationSchema } from "@/lib/schemas/reservation";
import { paystackInitializeSchema } from "@/lib/schemas/payment";

describe("reservationSchema", () => {
  it("accepts valid room reservation payload", () => {
    const parsed = reservationSchema.safeParse({
      firstName: "QA",
      lastName: "Tester",
      email: "qa@example.com",
      stayPreference: "signature-suite",
      message: "Automated test",
      itemType: "room",
      roomId: "signature-suite",
      nights: 2,
      guests: 2,
    });
    assert.equal(parsed.success, true);
  });

  it("rejects missing email", () => {
    const parsed = reservationSchema.safeParse({
      firstName: "QA",
      lastName: "Tester",
      stayPreference: "suite",
      message: "test",
    });
    assert.equal(parsed.success, false);
  });
});

describe("paystackInitializeSchema", () => {
  it("requires reservationId UUID", () => {
    const withoutId = paystackInitializeSchema.safeParse({
      email: "qa@example.com",
      itemType: "room",
      itemId: "signature-suite",
    });
    assert.equal(withoutId.success, false);

    const withId = paystackInitializeSchema.safeParse({
      email: "qa@example.com",
      itemType: "room",
      itemId: "signature-suite",
      reservationId: "550e8400-e29b-41d4-a716-446655440000",
      nights: 2,
    });
    assert.equal(withId.success, true);
  });
});
