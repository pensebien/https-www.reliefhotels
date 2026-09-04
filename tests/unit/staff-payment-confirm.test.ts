import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addPayment,
  addReservation,
  findReservationById,
} from "@/lib/demo-store";
import { manuallyConfirmPendingPayment } from "@/lib/staff-payment-confirm";

async function seedPendingPayment(
  reference: string,
  paymentMethod:
    | "moniepoint_terminal"
    | "moniepoint_transfer"
    | "paystack_terminal"
    | "bank_transfer_manual"
    | "cash",
  status: "pending" | "success" = "pending",
) {
  const reservation = await addReservation({
    firstName: "Manual",
    lastName: "Confirm",
    email: `${reference.toLowerCase()}@example.com`,
    itemType: "room",
    roomId: "guest-room",
    guests: 1,
    stayPreference: "test fixture",
    message: "",
    status: "pending",
    emailSent: false,
  });

  await addPayment({
    reference,
    reservationId: reservation.id,
    email: reservation.email,
    amountKobo: 500000,
    currency: "NGN",
    status,
    itemType: "room",
    itemId: "guest-room",
    itemLabel: "guest-room — deposit",
    paymentMethod,
    paymentChannel:
      paymentMethod === "cash"
        ? "cash"
        : paymentMethod === "bank_transfer_manual"
          ? "bank_transfer_manual"
          : "moniepoint",
  });

  return reservation;
}

describe("manuallyConfirmPendingPayment", () => {
  it("confirms a pending paystack_terminal payment and its reservation", async () => {
    const reference = `RH-PSPOS-CONFIRM-${Date.now()}`;
    const reservation = await seedPendingPayment(reference, "paystack_terminal");

    const result = await manuallyConfirmPendingPayment(reference);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.payment.status, "success");
      assert.equal(result.payment.externalReference, "STAFF-MANUAL-CONFIRM");
    }

    const updatedReservation = await findReservationById(reservation.id);
    assert.equal(updatedReservation?.status, "confirmed");
  });

  it("confirms a pending moniepoint_transfer payment", async () => {
    const reference = `RH-MPTF-CONFIRM-${Date.now()}`;
    await seedPendingPayment(reference, "moniepoint_transfer");

    const result = await manuallyConfirmPendingPayment(reference);
    assert.equal(result.ok, true);
  });

  it("confirms a pending bank_transfer_manual payment", async () => {
    const reference = `RH-BTM-CONFIRM-${Date.now()}`;
    const reservation = await seedPendingPayment(reference, "bank_transfer_manual");

    const result = await manuallyConfirmPendingPayment(reference);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.payment.status, "success");

    const updatedReservation = await findReservationById(reservation.id);
    assert.equal(updatedReservation?.status, "confirmed");
  });

  it("rejects cash payments as not manually confirmable", async () => {
    const reference = `RH-CASH-CONFIRM-${Date.now()}`;
    await seedPendingPayment(reference, "cash", "success");

    const result = await manuallyConfirmPendingPayment(reference);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "not_confirmable");
  });

  it("rejects a payment that is not pending", async () => {
    const reference = `RH-PSPOS-ALREADY-${Date.now()}`;
    await seedPendingPayment(reference, "paystack_terminal", "success");

    const result = await manuallyConfirmPendingPayment(reference);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "not_pending");
  });

  it("rejects an unknown reference", async () => {
    const result = await manuallyConfirmPendingPayment("RH-DOES-NOT-EXIST");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "not_found");
  });
});
