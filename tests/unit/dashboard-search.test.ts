import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterPaymentsBySearch,
  filterReservationsBySearch,
  paymentMatchesSearch,
  reservationMatchesSearch,
} from "@/lib/dashboard-search";

const reservation = {
  id: "res-1",
  firstName: "Ada",
  lastName: "Okonkwo",
  email: "ada@example.com",
  phone: "+2348012345678",
  checkIn: "2026-07-01",
  checkOut: "2026-07-03",
  paymentReference: "RH-REF-001",
  stayPreference: "Executive King",
  roomId: "executive-king",
  status: "confirmed",
  source: "website",
};

const payment = {
  id: "pay-1",
  reference: "RH-PAY-001",
  reservationId: "res-1",
  email: "ada@example.com",
  amountKobo: 5000000,
  itemLabel: "Executive King · 2 nights",
  itemId: "executive-king",
  status: "success",
  source: "paystack",
};

describe("dashboard search", () => {
  it("matches reservations by guest name and email", () => {
    assert.equal(reservationMatchesSearch(reservation, "okonkwo"), true);
    assert.equal(reservationMatchesSearch(reservation, "ada@example"), true);
    assert.equal(reservationMatchesSearch(reservation, "executive-king"), true);
    assert.equal(reservationMatchesSearch(reservation, "unknown"), false);
  });

  it("matches payments by reference and amount", () => {
    assert.equal(paymentMatchesSearch(payment, "RH-PAY-001"), true);
    assert.equal(paymentMatchesSearch(payment, "50000"), true);
    assert.equal(paymentMatchesSearch(payment, "ada@example"), true);
    assert.equal(paymentMatchesSearch(payment, "missing"), false);
  });

  it("filters reservations only when scope is reservations", () => {
    const paymentsByReservation = new Map([["res-1", [payment]]]);
    const filtered = filterReservationsBySearch(
      [reservation],
      paymentsByReservation,
      "RH-PAY-001",
      "reservations",
    );
    assert.equal(filtered.length, 0);
  });

  it("cross-links reservations and payments when scope is both", () => {
    const paymentsByReservation = new Map([["res-1", [payment]]]);
    const reservationsById = new Map([["res-1", reservation]]);

    const reservations = filterReservationsBySearch(
      [reservation],
      paymentsByReservation,
      "RH-PAY-001",
      "both",
    );
    assert.equal(reservations.length, 1);

    const payments = filterPaymentsBySearch(
      [payment],
      reservationsById,
      "okonkwo",
      "both",
    );
    assert.equal(payments.length, 1);
  });
});
