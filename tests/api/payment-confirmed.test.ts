import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.DEMO_DASHBOARD_KEY = "test-dashboard-key";
  process.env.NOTIFY_CHANNEL = "console";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.MONIEPOINT_CLIENT_ID;
  delete process.env.MONIEPOINT_CLIENT_SECRET;
  delete process.env.MONIEPOINT_TERMINAL_SERIAL;
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.PAYSTACK_TERMINAL_ID;
}

function stayDates() {
  const offset = Math.floor(Date.now() / 1000) % 200;
  const base = new Date(Date.UTC(2028, 6, 1 + offset));
  const checkIn = base.toISOString().slice(0, 10);
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  const checkOut = out.toISOString().slice(0, 10);
  return { checkIn, checkOut };
}

/** Finds the Resend call (if any) whose body's subject mentions "Payment received". */
function findPaymentReceiptCall(fetchMock: ReturnType<typeof mock.method>) {
  for (const call of fetchMock.mock.calls) {
    const [url, init] = call.arguments as [string, RequestInit];
    if (url !== "https://api.resend.com/emails") continue;
    const body = JSON.parse(init.body as string);
    if (typeof body.subject === "string" && body.subject.includes("Payment received")) {
      return body;
    }
  }
  return null;
}

describe("Cash payments now send a guest receipt + manager alert (previously only online checkout did)", () => {
  const originalKey = process.env.RESEND_API_KEY;

  before(() => {
    setTestEnv();
    process.env.RESEND_API_KEY = "re_test_123";
  });

  after(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it("walk-in Cash reservation sends the guest a payment receipt", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async (url: string) => {
      if (url === "https://api.resend.com/emails") {
        return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
      }
      throw new Error(`Unexpected fetch to ${url}`);
    });

    const { POST } = await import("@/app/api/demo/reservations/route");
    const { checkIn, checkOut } = stayDates();
    const email = `walkin-receipt-${Date.now()}@example.com`;

    const res = await POST(
      new Request(
        "http://localhost/api/demo/reservations?key=test-dashboard-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "Receipt",
            lastName: "Test",
            email,
            roomId: "guest-room",
            checkIn,
            checkOut,
            guests: 1,
            paymentMethod: "cash",
            status: "confirmed",
          }),
        },
      ),
    );
    assert.equal(res.status, 200);

    const receipt = findPaymentReceiptCall(fetchMock);
    assert.ok(receipt, "expected a Resend call with a payment-received subject");
    assert.deepEqual(receipt.to, [email]);

    fetchMock.mock.restore();
  });

  it("cashier Cash settle sends the guest a payment receipt", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async (url: string) => {
      if (url === "https://api.resend.com/emails") {
        return new Response(JSON.stringify({ id: "email_2" }), { status: 200 });
      }
      throw new Error(`Unexpected fetch to ${url}`);
    });

    const { POST: createReservation } = await import(
      "@/app/api/demo/reservations/route"
    );
    const { checkIn, checkOut } = stayDates();
    const email = `cashier-receipt-${Date.now()}@example.com`;
    const createRes = await createReservation(
      new Request(
        "http://localhost/api/demo/reservations?key=test-dashboard-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "Cashier",
            lastName: "Receipt",
            email,
            roomId: "guest-room",
            checkIn,
            checkOut,
            guests: 1,
          }),
        },
      ),
    );
    const { id: reservationId } = (await createRes.json()) as { id: string };

    const { POST: settlePost } = await import(
      "@/app/api/staff/cashier/settle/route"
    );
    const settleRes = await settlePost(
      new Request(
        "http://localhost/api/staff/cashier/settle?key=test-dashboard-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reservationId,
            amountNgn: 10000,
            paymentMethod: "cash",
            clientMutationId: randomUUID(),
          }),
        },
      ),
    );
    assert.equal(settleRes.status, 200);

    const receipt = findPaymentReceiptCall(fetchMock);
    assert.ok(receipt, "expected a Resend call with a payment-received subject");
    assert.deepEqual(receipt.to, [email]);

    fetchMock.mock.restore();
  });
});
