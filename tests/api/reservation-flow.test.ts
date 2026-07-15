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

/** Unique far-future stay dates so inventory from prior runs does not 409. */
function stayDates() {
  const offset = Math.floor(Date.now() / 1000) % 200;
  const base = new Date(Date.UTC(2027, 5, 1 + offset));
  const checkIn = base.toISOString().slice(0, 10);
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  const checkOut = out.toISOString().slice(0, 10);
  return { checkIn, checkOut, nights: 2 };
}

function reservationBody() {
  const { checkIn, checkOut, nights } = stayDates();
  return {
    firstName: "Auto",
    lastName: "QA",
    email: `qa-${Date.now()}@example.com`,
    phone: "+2348000000000",
    stayPreference: `guest-room · ${nights} night(s) · 2 guest(s)`,
    message: "Automated API flow test",
    itemType: "room" as const,
    roomId: "guest-room",
    checkIn,
    checkOut,
    nights,
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
          itemId: "guest-room",
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

    const body = reservationBody();
    const createRes = await createReservation(
      new Request("http://localhost/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
          itemId: "guest-room",
          reservationId: created.id,
          nights: body.nights,
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

    const body = reservationBody();
    const createRes = await createReservation(
      new Request("http://localhost/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
          itemId: "guest-room",
          reservationId: id,
          nights: body.nights,
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
          itemId: "guest-room",
          reservationId: id,
          nights: body.nights,
          demoAmountNgn: 5000,
        }),
      }),
    );
    assert.equal(retryRes.status, 409);
  });
});
