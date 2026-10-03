import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.DEMO_DASHBOARD_KEY = "test-dashboard-key";
  process.env.NOTIFY_CHANNEL = "console";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.MONIEPOINT_CLIENT_ID;
}

/**
 * Fresh far-future dates per call: walk-ins now refuse overbooking, so fixed
 * dates fill up as test runs accumulate in data/demo-store.json.
 */
let staySeq = 0;
function uniqueStay() {
  const base = new Date(Date.UTC(2036, 0, 1 + (Math.floor(Date.now() / 1000) % 3000) + staySeq++ * 3));
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  return { checkIn: base.toISOString().slice(0, 10), checkOut: out.toISOString().slice(0, 10) };
}

describe("POST /api/demo/reservations", () => {
  before(() => {
    setTestEnv();
  });

  it("rejects missing dashboard key", async () => {
    const { POST } = await import("@/app/api/demo/reservations/route");
    const res = await POST(
      new Request("http://localhost/api/demo/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    assert.equal(res.status, 401);
  });

  it("creates a walk-in reservation with cash deposit", async () => {
    const { POST } = await import("@/app/api/demo/reservations/route");
    const email = `walkin-${Date.now()}@example.com`;
    const res = await POST(
      new Request(
        "http://localhost/api/demo/reservations?key=test-dashboard-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "Walk",
            lastName: "In",
            email,
            phone: "+2348012345678",
            roomId: "guest-room",
            ...uniqueStay(),
            guests: 2,
            message: "Arriving by 4pm",
            status: "confirmed",
            paymentMethod: "cash",
          }),
        },
      ),
    );

    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      ok: boolean;
      id: string;
      paymentReference?: string;
      paymentMethod?: string;
      depositNgn?: number;
    };
    assert.equal(body.ok, true);
    assert.ok(body.id);
    assert.equal(body.paymentMethod, "cash");
    assert.ok(body.paymentReference?.startsWith("RH-CASH-"));
    assert.ok(body.depositNgn && body.depositNgn > 0);
  });

  it("creates pending terminal payment for moniepoint terminal", async () => {
    const { POST } = await import("@/app/api/demo/reservations/route");
    const email = `terminal-${Date.now()}@example.com`;
    const res = await POST(
      new Request(
        "http://localhost/api/demo/reservations?key=test-dashboard-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "POS",
            lastName: "Guest",
            email,
            roomId: "guest-room",
            ...uniqueStay(),
            guests: 1,
            paymentMethod: "moniepoint_terminal",
            status: "pending",
          }),
        },
      ),
    );

    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      paymentPending?: boolean;
      paymentReference?: string;
      paymentMethod?: string;
    };
    assert.equal(body.paymentMethod, "moniepoint_terminal");
    assert.equal(body.paymentPending, true);
    assert.ok(body.paymentReference?.startsWith("RH-MPOS-"));
  });

  it("creates pending transfer payment for moniepoint bank transfer", async () => {
    const { POST } = await import("@/app/api/demo/reservations/route");
    const email = `transfer-${Date.now()}@example.com`;
    const res = await POST(
      new Request(
        "http://localhost/api/demo/reservations?key=test-dashboard-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "Bank",
            lastName: "Guest",
            email,
            roomId: "guest-room",
            ...uniqueStay(),
            guests: 2,
            paymentMethod: "moniepoint_transfer",
            status: "pending",
          }),
        },
      ),
    );

    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      paymentPending?: boolean;
      paymentReference?: string;
      paymentMethod?: string;
    };
    assert.equal(body.paymentMethod, "moniepoint_transfer");
    assert.equal(body.paymentPending, true);
    assert.ok(body.paymentReference?.startsWith("RH-MPTF-"));
  });

  it("creates pending terminal payment for paystack terminal (Card, demo mode)", async () => {
    const { POST } = await import("@/app/api/demo/reservations/route");
    const email = `paystack-pos-${Date.now()}@example.com`;
    const res = await POST(
      new Request(
        "http://localhost/api/demo/reservations?key=test-dashboard-key",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: "Card",
            lastName: "Guest",
            email,
            roomId: "guest-room",
            ...uniqueStay(),
            guests: 1,
            paymentMethod: "paystack_terminal",
            status: "pending",
          }),
        },
      ),
    );

    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      paymentPending?: boolean;
      paymentReference?: string;
      paymentMethod?: string;
    };
    assert.equal(body.paymentMethod, "paystack_terminal");
    assert.equal(body.paymentPending, true);
    assert.ok(body.paymentReference?.startsWith("RH-PSPOS-"));
  });
});
