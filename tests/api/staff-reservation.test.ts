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
            checkIn: "2026-09-01",
            checkOut: "2026-09-03",
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
            checkIn: "2026-10-01",
            checkOut: "2026-10-02",
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
            checkIn: "2026-10-05",
            checkOut: "2026-10-07",
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
            checkIn: "2026-10-10",
            checkOut: "2026-10-11",
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
