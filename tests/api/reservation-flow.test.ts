import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.NOTIFY_CHANNEL = "console";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
  delete process.env.TERMII_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function reservationBody() {
  return {
    firstName: "Auto",
    lastName: "QA",
    email: `qa-${Date.now()}@example.com`,
    phone: "+2348000000000",
    stayPreference: "signature-suite · 2 night(s) · 2 guest(s)",
    message: "Automated API flow test",
    itemType: "room" as const,
    roomId: "signature-suite",
    checkIn: "2026-08-01",
    checkOut: "2026-08-03",
    nights: 2,
    guests: 2,
  };
}

describe("Reservation API flow (Part 1 + Part 2)", () => {
  before(() => {
    setTestEnv();
  });

  it("POST /api/reservations returns id and notified:false", async () => {
    const { POST } = await import("@/app/api/reservations/route");
    const res = await POST(
      new Request("http://localhost/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationBody()),
      }),
    );
    const data = (await res.json()) as {
      ok?: boolean;
      id?: string;
      notified?: boolean;
    };

    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.ok(data.id);
    assert.equal(data.notified, false);
  });

  it("POST /api/paystack/initialize rejects missing reservationId", async () => {
    const { POST } = await import("@/app/api/paystack/initialize/route");
    const res = await POST(
      new Request("http://localhost/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "qa@example.com",
          itemType: "room",
          itemId: "signature-suite",
          nights: 2,
        }),
      }),
    );
    assert.equal(res.status, 400);
  });

  it("full flow: reserve → initialize → verify (demo)", async () => {
    const { POST: createReservation } = await import(
      "@/app/api/reservations/route"
    );
    const { POST: initPayment } = await import(
      "@/app/api/paystack/initialize/route"
    );
    const { GET: verifyPayment } = await import(
      "@/app/api/paystack/verify/route"
    );

    const createRes = await createReservation(
      new Request("http://localhost/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationBody()),
      }),
    );
    const created = (await createRes.json()) as { id: string };
    assert.ok(created.id);

    const initRes = await initPayment(
      new Request("http://localhost/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "qa-flow@example.com",
          itemType: "room",
          itemId: "signature-suite",
          reservationId: created.id,
          nights: 2,
          guests: 2,
          demoAmountNgn: 5000,
        }),
      }),
    );
    const initData = (await initRes.json()) as {
      ok?: boolean;
      reference?: string;
      authorizationUrl?: string;
      amountNgn?: number;
    };

    assert.equal(initRes.status, 200);
    assert.equal(initData.ok, true);
    assert.ok(initData.reference);
    assert.equal(initData.amountNgn, 5000);
    assert.ok(initData.authorizationUrl?.includes("demo=1"));

    const verifyRes = await verifyPayment(
      new Request(
        `http://localhost/api/paystack/verify?reference=${encodeURIComponent(initData.reference!)}&demo=1`,
      ),
    );
    const verifyData = (await verifyRes.json()) as {
      ok?: boolean;
      status?: string;
      reservationId?: string;
      notified?: boolean;
    };

    assert.equal(verifyRes.status, 200);
    assert.equal(verifyData.ok, true);
    assert.equal(verifyData.status, "success");
    assert.equal(verifyData.reservationId, created.id);
  });

  it("POST /api/paystack/initialize rejects non-pending reservation", async () => {
    const { POST: createReservation } = await import(
      "@/app/api/reservations/route"
    );
    const { POST: initPayment } = await import(
      "@/app/api/paystack/initialize/route"
    );
    const { GET: verifyPayment } = await import(
      "@/app/api/paystack/verify/route"
    );

    const createRes = await createReservation(
      new Request("http://localhost/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservationBody()),
      }),
    );
    const { id } = (await createRes.json()) as { id: string };

    const initRes = await initPayment(
      new Request("http://localhost/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "qa@example.com",
          itemType: "room",
          itemId: "signature-suite",
          reservationId: id,
          nights: 2,
          demoAmountNgn: 5000,
        }),
      }),
    );
    const { reference } = (await initRes.json()) as { reference: string };

    await verifyPayment(
      new Request(
        `http://localhost/api/paystack/verify?reference=${encodeURIComponent(reference)}&demo=1`,
      ),
    );

    const retryRes = await initPayment(
      new Request("http://localhost/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "qa@example.com",
          itemType: "room",
          itemId: "signature-suite",
          reservationId: id,
          nights: 2,
          demoAmountNgn: 5000,
        }),
      }),
    );
    assert.equal(retryRes.status, 409);
  });
});
