import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { staffReservationSchema } from "@/lib/schemas/staff-reservation";

describe("staffReservationSchema", () => {
  it("accepts moniepoint transfer without manual reference", () => {
    const parsed = staffReservationSchema.safeParse({
      firstName: "Ada",
      lastName: "Okonkwo",
      email: "ada@example.com",
      roomId: "guest-room",
      checkIn: "2026-09-01",
      checkOut: "2026-09-03",
      guests: 2,
      paymentMethod: "moniepoint_transfer",
      status: "pending",
    });
    assert.equal(parsed.success, true);
  });

  it("accepts cash walk-in booking", () => {
    const parsed = staffReservationSchema.safeParse({
      firstName: "Ada",
      lastName: "Okonkwo",
      email: "ada@example.com",
      roomId: "guest-room",
      checkIn: "2026-09-01",
      checkOut: "2026-09-03",
      guests: 2,
      paymentMethod: "cash",
      status: "confirmed",
    });
    assert.equal(parsed.success, true);
  });

  it("accepts paystack terminal (Card) without requiring confirmed status", () => {
    const parsed = staffReservationSchema.safeParse({
      firstName: "Ada",
      lastName: "Okonkwo",
      email: "ada@example.com",
      roomId: "guest-room",
      checkIn: "2026-09-01",
      checkOut: "2026-09-03",
      guests: 2,
      paymentMethod: "paystack_terminal",
      status: "pending",
    });
    assert.equal(parsed.success, true);
  });
});
