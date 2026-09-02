import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { addPayment, addReservation } from "@/lib/demo-store";
import { syncPaystackTerminalPayment } from "@/lib/paystack-terminal";

async function seedPendingCardPayment(reference: string) {
  const reservation = await addReservation({
    firstName: "Card",
    lastName: "Guest",
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
    status: "pending",
    itemType: "room",
    itemId: "guest-room",
    itemLabel: "guest-room — Paystack terminal deposit",
    paymentMethod: "paystack_terminal",
    paymentChannel: "paystack",
  });

  return reservation;
}

describe("syncPaystackTerminalPayment", () => {
  const originalDemoMode = process.env.DEMO_MODE;

  before(() => {
    delete process.env.PAYSTACK_TERMINAL_ID;
  });

  after(() => {
    if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = originalDemoMode;
  });

  it("stays pending when Paystack Terminal is unconfigured and DEMO_MODE is not explicitly set", async () => {
    delete process.env.DEMO_MODE;
    const reference = `RH-PSPOS-TEST1-${Date.now()}`;
    await seedPendingCardPayment(reference);

    const updated = await syncPaystackTerminalPayment(reference);
    assert.equal(updated?.status, "pending");
  });

  it("auto-approves when DEMO_MODE=true, even though unconfigured (local/QA convenience)", async () => {
    process.env.DEMO_MODE = "true";
    const reference = `RH-PSPOS-TEST2-${Date.now()}`;
    await seedPendingCardPayment(reference);

    const updated = await syncPaystackTerminalPayment(reference);
    assert.equal(updated?.status, "success");
  });

  it("auto-approves with demoOverride even when DEMO_MODE is not set", async () => {
    delete process.env.DEMO_MODE;
    const reference = `RH-PSPOS-TEST3-${Date.now()}`;
    await seedPendingCardPayment(reference);

    const updated = await syncPaystackTerminalPayment(reference, true);
    assert.equal(updated?.status, "success");
  });
});
