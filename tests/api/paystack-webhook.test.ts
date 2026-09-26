import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";

const SECRET = "sk_test_webhook_not_a_real_key_but_valid_prefix";

function signedRequest(payload: unknown, secret = SECRET) {
  const body = JSON.stringify(payload);
  return new Request("http://localhost:3002/api/paystack/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-paystack-signature": createHmac("sha512", secret).update(body).digest("hex"),
    },
    body,
  });
}

async function seedPendingDeposit(amountKobo: number) {
  const { addPayment, addReservation } = await import("@/lib/demo-store");
  const reservation = await addReservation({
    firstName: "Webhook",
    lastName: "Guest",
    email: "webhook-guest@example.com",
    itemType: "room",
    guests: 1,
    stayPreference: "room:guest-room",
    message: "",
    emailSent: false,
  });
  const reference = `RH-TEST-${randomUUID().slice(0, 8)}`;
  await addPayment({
    reference,
    reservationId: reservation.id,
    email: reservation.email,
    amountKobo,
    currency: "NGN",
    status: "pending",
    itemType: "room",
    itemId: "guest-room",
    itemLabel: "guest-room deposit",
    paymentMethod: "paystack",
  });
  return { reference, reservationId: reservation.id };
}

function resendBodies(fetchMock: ReturnType<typeof mock.method>) {
  return fetchMock.mock.calls
    .map((call) => call.arguments as [string, RequestInit])
    .filter(([url]) => url === "https://api.resend.com/emails")
    .map(([, init]) => JSON.parse(init.body as string));
}

describe("Paystack charge.success webhook", () => {
  const prev = { ...process.env };

  before(() => {
    process.env.DEMO_MODE = "false";
    process.env.NOTIFY_CHANNEL = "console";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
    process.env.PAYSTACK_SECRET_KEY = SECRET;
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = "pk_test_webhook_not_a_real_key_but_valid_prefix";
    process.env.RESEND_API_KEY = "re_test_123";
    delete process.env.EMAIL_FROM;
    delete process.env.FINANCE_EMAIL_FROM;
    delete process.env.FINANCE_EMAIL;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.RAYZA_CONNECT_ENABLED;
  });

  after(() => {
    process.env = prev;
  });

  it("rejects a request with a bad signature", async () => {
    const { POST } = await import("@/app/api/paystack/webhook/route");
    const res = await POST(
      signedRequest({ event: "charge.success", data: { reference: "x", amount: 1 } }, "sk_test_wrong"),
    );
    assert.equal(res.status, 401);
  });

  it("marks the deposit paid, confirms the reservation, and sends one finance receipt", async () => {
    const { POST } = await import("@/app/api/paystack/webhook/route");
    const { findPaymentByReference, findReservationById } = await import("@/lib/demo-store");
    const { reference, reservationId } = await seedPendingDeposit(1_000_000);

    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ id: "email_1" }), { status: 200 }),
    );

    const event = { event: "charge.success", data: { reference, amount: 1_000_000 } };
    const first = await POST(signedRequest(event));
    assert.equal(first.status, 200);
    assert.equal((await first.json()).outcome, "confirmed");

    // Paystack retries deliveries — a replay must not send a second receipt.
    const replay = await POST(signedRequest(event));
    assert.equal((await replay.json()).outcome, "already_confirmed");

    assert.equal((await findPaymentByReference(reference))?.status, "success");
    assert.equal((await findReservationById(reservationId))?.status, "confirmed");

    const receipts = resendBodies(fetchMock).filter((b) => b.subject.includes("Payment received"));
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].from, "Relief Hotels Finance <finance@mail.reliefhotelsandsuites.com>");
    assert.deepEqual(receipts[0].to, ["webhook-guest@example.com"]);
    assert.equal(receipts[0].reply_to, "finance@reliefhotelsandsuites.com");
    assert.deepEqual(receipts[0].bcc, ["finance@reliefhotelsandsuites.com"]);

    fetchMock.mock.restore();
  });

  it("does not confirm when the charged amount differs from the deposit", async () => {
    const { POST } = await import("@/app/api/paystack/webhook/route");
    const { findPaymentByReference } = await import("@/lib/demo-store");
    const { reference } = await seedPendingDeposit(1_000_000);

    const res = await POST(
      signedRequest({ event: "charge.success", data: { reference, amount: 100 } }),
    );
    assert.equal(res.status, 200);
    assert.equal((await res.json()).outcome, "amount_mismatch");
    assert.equal((await findPaymentByReference(reference))?.status, "pending");
  });

  it("ignores non charge.success events", async () => {
    const { POST } = await import("@/app/api/paystack/webhook/route");
    const res = await POST(signedRequest({ event: "transfer.success", data: {} }));
    assert.equal((await res.json()).ignored, true);
  });
});
