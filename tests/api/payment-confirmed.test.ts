import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { fakeRayza, installFakeRayza, resetFakeRayza, uninstallFakeRayza } from "../helpers/fake-rayza";

/**
 * handlePaymentConfirmed is the one path every successful payment takes:
 * the booking goes to RAYZA, the guest gets a receipt, and when RAYZA refuses
 * a paid booking the guest and the front desk are told so a person can act.
 */

let staySeq = 0;
function stayDates() {
  const offset = (Math.floor(Date.now() / 1000) % 4000) * 3 + staySeq++ * 3;
  const base = new Date(Date.UTC(2038, 6, 1 + offset));
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  return { checkIn: base.toISOString().slice(0, 10), checkOut: out.toISOString().slice(0, 10) };
}

const sentEmails: { subject: string; to: string[] }[] = [];

async function paidBooking() {
  const { addPayment, addReservation, updateReservationById } = await import("@/lib/demo-store");
  const reservation = await addReservation({
    firstName: "Paid",
    lastName: "Guest",
    email: `paid-${Date.now()}@example.com`,
    phone: "+2348012345678",
    stayPreference: "t",
    message: "t",
    itemType: "room",
    roomId: "presidential-suite",
    ...stayDates(),
    nights: 2,
    guests: 2,
    quotedTotalNgn: 400_000,
    quotedDepositNgn: 80_000,
    emailSent: false,
    status: "pending",
  });
  const payment = await addPayment({
    reference: `RH-TEST-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    reservationId: reservation.id,
    email: reservation.email,
    amountKobo: 8_000_000,
    currency: "NGN",
    status: "success",
    itemType: "room",
    itemId: "presidential-suite",
    itemLabel: "presidential-suite — deposit",
  });
  const confirmed = (await updateReservationById(reservation.id, { status: "confirmed" }))!;
  return { reservation: confirmed, payment };
}

describe("handlePaymentConfirmed", () => {
  before(async () => {
    process.env.DEMO_MODE = "true";
    process.env.NOTIFY_CHANNEL = "console";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
    process.env.RESEND_API_KEY = "re_test_123";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await installFakeRayza();
    // Capture Resend calls; everything else goes to the fake RAYZA.
    const toRayza = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "https://api.resend.com/emails") {
        const body = JSON.parse(String(init?.body)) as { subject: string; to: string[] };
        sentEmails.push({ subject: body.subject, to: body.to });
        return new Response(JSON.stringify({ id: "email" }), { status: 200 });
      }
      return toRayza(input, init);
    }) as typeof fetch;
  });

  beforeEach(async () => {
    sentEmails.length = 0;
    await resetFakeRayza();
  });

  after(async () => {
    delete process.env.RESEND_API_KEY;
    await uninstallFakeRayza();
  });

  it("sends the paid booking to RAYZA with what was paid, and a receipt to the guest", async () => {
    const { reservation, payment } = await paidBooking();
    const { handlePaymentConfirmed } = await import("@/lib/payment-confirmed");
    await handlePaymentConfirmed(payment, reservation);

    const [pushed] = fakeRayza.active();
    assert.equal(pushed.body.room_identifier, "presidential-suite");
    assert.equal(pushed.body.deposit_paid, 80_000);
    assert.ok(sentEmails.some((e) => e.subject.includes("Payment received") && e.to.includes(reservation.email)));
    assert.ok(!sentEmails.some((e) => e.subject.includes("ACTION NEEDED")));
  });

  it("when RAYZA refuses a paid booking, tells the guest and the front desk", async () => {
    fakeRayza.forceConflict = true;
    const { reservation, payment } = await paidBooking();
    const { handlePaymentConfirmed } = await import("@/lib/payment-confirmed");
    await handlePaymentConfirmed(payment, reservation);

    assert.equal(fakeRayza.active().length, 0);
    assert.ok(sentEmails.some((e) => e.subject.includes("ACTION NEEDED")), "front desk alerted");
    assert.ok(sentEmails.some((e) => e.subject.includes("Your payment is received") && e.to.includes(reservation.email)));

    const { loadOpsBoard } = await import("@/lib/staff-ops");
    const row = (await loadOpsBoard()).find((r) => r.id === reservation.id);
    assert.equal(row?.needsAttention, true, "flagged in the ops view");
  });

  it("an unreachable RAYZA is left to the scheduled retry, not escalated", async () => {
    fakeRayza.down = true;
    const { reservation, payment } = await paidBooking();
    const { handlePaymentConfirmed } = await import("@/lib/payment-confirmed");
    await handlePaymentConfirmed(payment, reservation);
    assert.ok(!sentEmails.some((e) => e.subject.includes("ACTION NEEDED")));
  });
});
