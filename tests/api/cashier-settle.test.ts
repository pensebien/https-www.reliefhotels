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

/** Unique far-future stay dates so inventory from prior runs does not clash. */
function stayDates() {
  const offset = Math.floor(Date.now() / 1000) % 200;
  const base = new Date(Date.UTC(2028, 2, 1 + offset));
  const checkIn = base.toISOString().slice(0, 10);
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  const checkOut = out.toISOString().slice(0, 10);
  return { checkIn, checkOut };
}

async function createPendingReservation(): Promise<string> {
  const { POST } = await import("@/app/api/demo/reservations/route");
  const { checkIn, checkOut } = stayDates();
  const email = `cashier-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  const res = await POST(
    new Request(
      "http://localhost/api/demo/reservations?key=test-dashboard-key",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Cashier",
          lastName: "QA",
          email,
          phone: "+2348000000000",
          roomId: "guest-room",
          checkIn,
          checkOut,
          guests: 2,
          message: "Cashier settle API test",
        }),
      },
    ),
  );

  assert.equal(res.status, 200);
  const body = (await res.json()) as { id: string; reservation: { status: string } };
  assert.equal(body.reservation.status, "pending");
  return body.id;
}

type SettleBody = {
  ok?: boolean;
  error?: string;
  paymentId?: string;
  reference?: string;
  status?: string;
  provider?: string;
  demo?: boolean;
  idempotentReplay?: boolean;
  reservation?: { id: string; status: string };
  payment?: { id: string; status: string; reference: string };
};

async function postSettle(body: unknown, key: string | null = "test-dashboard-key") {
  const { POST } = await import("@/app/api/staff/cashier/settle/route");
  const url = key
    ? `http://localhost/api/staff/cashier/settle?key=${key}`
    : "http://localhost/api/staff/cashier/settle";
  const res = await POST(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  const data = (await res.json()) as SettleBody;
  return { res, data };
}

async function getSettleStatus(reference: string, demo = false) {
  const { GET } = await import("@/app/api/staff/cashier/settle/status/route");
  const demoParam = demo ? "&demo=1" : "";
  const res = await GET(
    new Request(
      `http://localhost/api/staff/cashier/settle/status?key=test-dashboard-key&reference=${encodeURIComponent(reference)}${demoParam}`,
    ),
  );
  const data = (await res.json()) as SettleBody;
  return { res, data };
}

describe("Cashier settle API (ADR-005)", () => {
  before(() => {
    setTestEnv();
  });

  it("rejects requests without a valid dashboard key", async () => {
    const reservationId = await createPendingReservation();
    const { res } = await postSettle(
      {
        reservationId,
        amountNgn: 5000,
        paymentMethod: "cash",
        clientMutationId: randomUUID(),
      },
      null,
    );
    assert.equal(res.status, 401);
  });

  it("also accepts the x-demo-key header", async () => {
    const reservationId = await createPendingReservation();
    const { POST } = await import("@/app/api/staff/cashier/settle/route");
    const res = await POST(
      new Request("http://localhost/api/staff/cashier/settle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-key": "test-dashboard-key",
        },
        body: JSON.stringify({
          reservationId,
          amountNgn: 5000,
          paymentMethod: "cash",
          clientMutationId: randomUUID(),
        }),
      }),
    );
    assert.equal(res.status, 200);
  });

  it("rejects an unknown reservationId", async () => {
    const { res, data } = await postSettle({
      reservationId: randomUUID(),
      amountNgn: 5000,
      paymentMethod: "cash",
      clientMutationId: randomUUID(),
    });
    assert.equal(res.status, 404);
    assert.ok(data.error);
  });

  it("cash settle happy path: success immediately + reservation confirmed", async () => {
    const reservationId = await createPendingReservation();
    const { res, data } = await postSettle({
      reservationId,
      amountNgn: 15000,
      paymentMethod: "cash",
      clientMutationId: randomUUID(),
      note: "Paid at desk",
    });

    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.status, "success");
    assert.equal(data.provider, "cash");
    assert.ok(data.reference?.startsWith("RH-CASH-"));
    assert.equal(data.payment?.status, "success");
    assert.equal(data.reservation?.status, "confirmed");
    assert.equal(data.reservation?.id, reservationId);
  });

  it("idempotent replay: same clientMutationId returns the original payment", async () => {
    const reservationId = await createPendingReservation();
    const clientMutationId = randomUUID();

    const first = await postSettle({
      reservationId,
      amountNgn: 20000,
      paymentMethod: "cash",
      clientMutationId,
    });
    assert.equal(first.res.status, 200);
    assert.equal(first.data.idempotentReplay ?? false, false);

    const second = await postSettle({
      reservationId,
      amountNgn: 20000,
      paymentMethod: "cash",
      clientMutationId,
    });
    assert.equal(second.res.status, 200);
    assert.equal(second.data.idempotentReplay, true);
    assert.equal(second.data.paymentId, first.data.paymentId);
    assert.equal(second.data.reference, first.data.reference);
  });

  it("Moniepoint terminal settle: pending → success via status sync (demo)", async () => {
    const reservationId = await createPendingReservation();
    const { res, data } = await postSettle({
      reservationId,
      amountNgn: 10000,
      paymentMethod: "moniepoint_terminal",
      clientMutationId: randomUUID(),
    });

    assert.equal(res.status, 200);
    assert.equal(data.status, "pending");
    assert.ok(data.reference?.startsWith("RH-MPOS-"));

    const status = await getSettleStatus(data.reference!);
    assert.equal(status.res.status, 200);
    assert.equal(status.data.status, "success");
    assert.equal(status.data.reservation?.status, "confirmed");
  });

  it("Moniepoint transfer settle: pending → success via status sync (demo)", async () => {
    const reservationId = await createPendingReservation();
    const { data } = await postSettle({
      reservationId,
      amountNgn: 10000,
      paymentMethod: "moniepoint_transfer",
      clientMutationId: randomUUID(),
    });

    assert.ok(data.reference?.startsWith("RH-MPTF-"));

    const status = await getSettleStatus(data.reference!);
    assert.equal(status.data.status, "success");
  });

  it("Paystack Terminal settle: simulated pending, auto-promoted to success in demo mode", async () => {
    const reservationId = await createPendingReservation();
    const { res, data } = await postSettle({
      reservationId,
      amountNgn: 25000,
      paymentMethod: "paystack_terminal",
      clientMutationId: randomUUID(),
    });

    assert.equal(res.status, 200);
    assert.equal(data.status, "pending");
    assert.equal(data.demo, true);
    assert.ok(data.reference?.startsWith("RH-PSTM-"));

    // DEMO_MODE=true already covers this, but the explicit ?demo=1 bypass
    // is exercised too (mirrors verifyPayment's demoBypass in paystack.ts).
    const promoted = await getSettleStatus(data.reference!, true);
    assert.equal(promoted.data.status, "success");
    assert.equal(promoted.data.reservation?.status, "confirmed");
  });

  it("status endpoint 404s for an unknown reference", async () => {
    const status = await getSettleStatus("RH-CASH-UNKNOWN-000000");
    assert.equal(status.res.status, 404);
  });
});
