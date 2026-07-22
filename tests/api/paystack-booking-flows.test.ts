/**
 * Booking payment test cases — cashier first, then customer (Paystack test mode).
 *
 * Auth follows https://paystack.com/docs/api/authentication/
 * (Authorization: Bearer SECRET_KEY).
 *
 * Default: DEMO_MODE cash + simulated customer verify (no network).
 * Live Paystack test API: RUN_PAYSTACK_LIVE=1 with sk_test_ / pk_test_ in env
 *   npm run test:paystack
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

const DASHBOARD_KEY = process.env.DEMO_DASHBOARD_KEY ?? "relief-demo-2026";
const runPaystackLive = process.env.RUN_PAYSTACK_LIVE === "1";

function setDemoEnv() {
  process.env.DEMO_MODE = "true";
  process.env.NOTIFY_CHANNEL = "console";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
  process.env.DEMO_DASHBOARD_KEY = DASHBOARD_KEY;
  process.env.CASHIER_ENABLED = "true";
  delete process.env.TERMII_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.PAYSTACK_TERMINAL_ID;
  delete process.env.MONIEPOINT_CLIENT_ID;
  delete process.env.MONIEPOINT_CLIENT_SECRET;
  delete process.env.MONIEPOINT_TERMINAL_SERIAL;
}

function stayDates(offsetDays = 0) {
  const offset = (Math.floor(Date.now() / 1000) % 180) + offsetDays;
  const base = new Date(Date.UTC(2027, 8, 1 + offset));
  const checkIn = base.toISOString().slice(0, 10);
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  return {
    checkIn,
    checkOut: out.toISOString().slice(0, 10),
    nights: 2,
  };
}

function walkInBody() {
  const { checkIn, checkOut, nights } = stayDates(3);
  return {
    firstName: "Cashier",
    lastName: "WalkIn",
    email: `cashier-qa-${Date.now()}@example.com`,
    phone: "+2348011111111",
    stayPreference: `guest-room · ${nights} night(s) · 2 guest(s)`,
    message: "Cashier walk-in QA",
    itemType: "room" as const,
    roomId: "guest-room",
    checkIn,
    checkOut,
    nights,
    guests: 2,
  };
}

function customerBody() {
  const { checkIn, checkOut, nights } = stayDates(40);
  return {
    firstName: "Customer",
    lastName: "Online",
    email: `customer-qa-${Date.now()}@example.com`,
    phone: "+2348022222222",
    stayPreference: `guest-room · ${nights} night(s) · 2 guest(s)`,
    message: "Customer Paystack QA",
    itemType: "room" as const,
    roomId: "guest-room",
    checkIn,
    checkOut,
    nights,
    guests: 2,
  };
}

describe("1) Cashier booking settle (front desk)", () => {
  before(() => {
    setDemoEnv();
  });

  it("creates a pending reservation then settles deposit with cash", async () => {
    const { POST: createReservation } = await import(
      "@/app/api/reservations/route"
    );
    const createRes = await createReservation(
      new Request("http://localhost/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(walkInBody()),
      }),
    );
    const created = (await createRes.json()) as { ok?: boolean; id?: string };
    assert.equal(createRes.status, 200);
    assert.ok(created.id);

    const { POST: settle } = await import(
      "@/app/api/staff/cashier/settle/route"
    );
    const settleRes = await settle(
      new Request(
        `http://localhost/api/staff/cashier/settle?key=${encodeURIComponent(DASHBOARD_KEY)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-demo-key": DASHBOARD_KEY,
          },
          body: JSON.stringify({
            reservationId: created.id,
            amountNgn: 5000,
            paymentMethod: "cash",
            clientMutationId: randomUUID(),
            note: "QA cashier cash settle",
          }),
        },
      ),
    );
    const settled = (await settleRes.json()) as {
      ok?: boolean;
      status?: string;
      reference?: string;
      error?: string;
    };

    assert.equal(settleRes.status, 200, settled.error ?? "settle failed");
    assert.equal(settled.ok, true);
    assert.equal(settled.status, "success");
    assert.ok(settled.reference);
  });
});

describe("2) Customer online booking (Paystack path)", () => {
  before(() => {
    setDemoEnv();
  });

  it("creates reservation, initializes payment, verifies with demo bypass", async () => {
    const { POST: createReservation } = await import(
      "@/app/api/reservations/route"
    );
    const body = customerBody();
    const createRes = await createReservation(
      new Request("http://localhost/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    const created = (await createRes.json()) as { ok?: boolean; id?: string };
    assert.equal(createRes.status, 200);
    assert.ok(created.id);

    const { POST: initialize } = await import(
      "@/app/api/paystack/initialize/route"
    );
    const initRes = await initialize(
      new Request("http://localhost/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: body.email,
          itemType: "room",
          itemId: "guest-room",
          reservationId: created.id,
          nights: 2,
          demoAmountNgn: 5000,
        }),
      }),
    );
    const init = (await initRes.json()) as {
      ok?: boolean;
      reference?: string;
      authorizationUrl?: string;
      demo?: boolean;
      error?: string;
    };
    assert.equal(initRes.status, 200, init.error ?? "initialize failed");
    assert.equal(init.ok, true);
    assert.ok(init.reference);
    assert.ok(init.authorizationUrl?.includes("/payment/callback"));
    assert.equal(init.demo, true);

    const { GET: verify } = await import("@/app/api/paystack/verify/route");
    const verifyRes = await verify(
      new Request(
        `http://localhost/api/paystack/verify?reference=${encodeURIComponent(init.reference!)}&demo=1`,
      ),
    );
    const verified = (await verifyRes.json()) as {
      ok?: boolean;
      status?: string;
    };
    assert.equal(verifyRes.status, 200);
    assert.equal(verified.ok, true);
    assert.equal(verified.status, "success");
  });
});

describe(
  "3) Live Paystack test-mode authentication + initialize",
  { skip: !runPaystackLive },
  () => {
    it("authenticates with Bearer sk_test_ and initializes a real test checkout", async () => {
      // Use real keys from the environment (do not force DEMO_MODE).
      delete process.env.DEMO_MODE;
      process.env.NOTIFY_CHANNEL = "console";
      process.env.NEXT_PUBLIC_APP_URL =
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

      const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
      const pub = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
      assert.ok(secret.startsWith("sk_test_"), "Need PAYSTACK_SECRET_KEY=sk_test_…");
      assert.ok(pub.startsWith("pk_test_"), "Need NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_…");

      const { verifyPaystackAuthentication, paystackAuthorizationHeader } =
        await import("@/lib/paystack-auth");

      assert.match(paystackAuthorizationHeader(secret), /^Bearer sk_test_/);

      const auth = await verifyPaystackAuthentication(secret);
      assert.equal(auth.ok, true, auth.message);
      assert.equal(auth.mode, "test");

      const { POST: createReservation } = await import(
        "@/app/api/reservations/route"
      );
      const body = customerBody();
      const createRes = await createReservation(
        new Request("http://localhost/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      const created = (await createRes.json()) as { id?: string };
      assert.ok(created.id);

      const { POST: initialize } = await import(
        "@/app/api/paystack/initialize/route"
      );
      const initRes = await initialize(
        new Request("http://localhost/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: body.email,
            itemType: "room",
            itemId: "guest-room",
            reservationId: created.id,
            nights: 2,
            demoAmountNgn: 5000,
          }),
        }),
      );
      const init = (await initRes.json()) as {
        ok?: boolean;
        demo?: boolean;
        authorizationUrl?: string;
        reference?: string;
        error?: string;
      };
      assert.equal(initRes.status, 200, init.error ?? "live initialize failed");
      assert.equal(init.ok, true);
      assert.equal(init.demo, false);
      assert.ok(init.authorizationUrl?.includes("paystack.com"));
      assert.ok(init.reference);
    });
  },
);
