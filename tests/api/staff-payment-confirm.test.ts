import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, describe, it } from "node:test";

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
  const base = new Date(Date.UTC(2028, 4, 1 + offset));
  const checkIn = base.toISOString().slice(0, 10);
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  const checkOut = out.toISOString().slice(0, 10);
  return { checkIn, checkOut };
}

/** Creates a walk-in "Card" reservation with DEMO_MODE unset, so the payment
 * genuinely stays pending (no terminal, no explicit demo bypass) — the exact
 * situation manual confirm exists for. */
async function createPendingCardPayment(): Promise<string> {
  const previousDemoMode = process.env.DEMO_MODE;
  delete process.env.DEMO_MODE;
  try {
    const { POST } = await import("@/app/api/demo/reservations/route");
    const { checkIn, checkOut } = stayDates();
    const email = `confirm-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

    const res = await POST(
      new Request(
        "http://localhost/api/demo/reservations?key=test-dashboard-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "Manual",
            lastName: "Confirm",
            email,
            roomId: "guest-room",
            checkIn,
            checkOut,
            guests: 1,
            paymentMethod: "paystack_terminal",
            status: "pending",
          }),
        },
      ),
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { paymentReference: string };
    return body.paymentReference;
  } finally {
    if (previousDemoMode === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = previousDemoMode;
  }
}

describe("POST /api/demo/payments/[reference]/confirm", () => {
  before(() => {
    setTestEnv();
  });

  it("rejects missing dashboard key", async () => {
    const { POST } = await import(
      "@/app/api/demo/payments/[reference]/confirm/route"
    );
    const res = await POST(
      new Request("http://localhost/api/demo/payments/RH-X/confirm", {
        method: "POST",
      }),
      { params: Promise.resolve({ reference: "RH-X" }) },
    );
    assert.equal(res.status, 401);
  });

  it("404s for an unknown reference", async () => {
    const { POST } = await import(
      "@/app/api/demo/payments/[reference]/confirm/route"
    );
    const res = await POST(
      new Request(
        "http://localhost/api/demo/payments/RH-UNKNOWN/confirm?key=test-dashboard-key",
        { method: "POST" },
      ),
      { params: Promise.resolve({ reference: "RH-UNKNOWN" }) },
    );
    assert.equal(res.status, 404);
  });

  it("confirms a genuinely pending Card (Paystack Terminal) payment", async () => {
    const reference = await createPendingCardPayment();

    const { POST } = await import(
      "@/app/api/demo/payments/[reference]/confirm/route"
    );
    const res = await POST(
      new Request(
        `http://localhost/api/demo/payments/${reference}/confirm?key=test-dashboard-key`,
        { method: "POST" },
      ),
      { params: Promise.resolve({ reference }) },
    );

    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      ok: boolean;
      status: string;
      payment: { status: string; externalReference?: string };
    };
    assert.equal(body.ok, true);
    assert.equal(body.status, "success");
    assert.equal(body.payment.externalReference, "STAFF-MANUAL-CONFIRM");
  });

  it("409s when confirming an already-settled payment again", async () => {
    const reference = await createPendingCardPayment();
    const { POST } = await import(
      "@/app/api/demo/payments/[reference]/confirm/route"
    );
    const url = `http://localhost/api/demo/payments/${reference}/confirm?key=test-dashboard-key`;

    const first = await POST(new Request(url, { method: "POST" }), {
      params: Promise.resolve({ reference }),
    });
    assert.equal(first.status, 200);

    const second = await POST(new Request(url, { method: "POST" }), {
      params: Promise.resolve({ reference }),
    });
    assert.equal(second.status, 409);
  });
});

describe("POST /api/staff/cashier/settle/confirm", () => {
  before(() => {
    setTestEnv();
  });

  async function createPendingReservation(): Promise<string> {
    const { POST } = await import("@/app/api/demo/reservations/route");
    const { checkIn, checkOut } = stayDates();
    const email = `cashier-confirm-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

    const res = await POST(
      new Request(
        "http://localhost/api/demo/reservations?key=test-dashboard-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "Cashier",
            lastName: "Confirm",
            email,
            roomId: "guest-room",
            checkIn,
            checkOut,
            guests: 2,
          }),
        },
      ),
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { id: string };
    return body.id;
  }

  it("rejects missing dashboard key", async () => {
    const { POST } = await import(
      "@/app/api/staff/cashier/settle/confirm/route"
    );
    const res = await POST(
      new Request("http://localhost/api/staff/cashier/settle/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: "RH-X" }),
      }),
    );
    assert.equal(res.status, 401);
  });

  it("400s when reference is missing", async () => {
    const { POST } = await import(
      "@/app/api/staff/cashier/settle/confirm/route"
    );
    const res = await POST(
      new Request(
        "http://localhost/api/staff/cashier/settle/confirm?key=test-dashboard-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      ),
    );
    assert.equal(res.status, 400);
  });

  it("confirms a genuinely pending cashier Card settle", async () => {
    const reservationId = await createPendingReservation();

    const previousDemoMode = process.env.DEMO_MODE;
    delete process.env.DEMO_MODE;
    let reference: string;
    try {
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
              paymentMethod: "paystack_terminal",
              clientMutationId: randomUUID(),
            }),
          },
        ),
      );
      assert.equal(settleRes.status, 200);
      const settleBody = (await settleRes.json()) as {
        reference: string;
        status: string;
      };
      assert.equal(settleBody.status, "pending");
      reference = settleBody.reference;
    } finally {
      if (previousDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = previousDemoMode;
    }

    const { POST: confirmPost } = await import(
      "@/app/api/staff/cashier/settle/confirm/route"
    );
    const confirmRes = await confirmPost(
      new Request(
        "http://localhost/api/staff/cashier/settle/confirm?key=test-dashboard-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        },
      ),
    );
    assert.equal(confirmRes.status, 200);
    const confirmBody = (await confirmRes.json()) as { status: string };
    assert.equal(confirmBody.status, "success");
  });
});
