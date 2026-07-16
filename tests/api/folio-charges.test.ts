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
}

/** Unique far-future stay dates so inventory from prior runs does not clash. */
function stayDates() {
  const offset = Math.floor(Date.now() / 1000) % 200;
  const base = new Date(Date.UTC(2028, 4, 1 + offset));
  const checkIn = base.toISOString().slice(0, 10);
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  const checkOut = out.toISOString().slice(0, 10);
  return { checkIn, checkOut };
}

async function createPendingReservation(): Promise<string> {
  const { POST } = await import("@/app/api/demo/reservations/route");
  const { checkIn, checkOut } = stayDates();
  const email = `fnb-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

  const res = await POST(
    new Request(
      "http://localhost/api/demo/reservations?key=test-dashboard-key",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Folio",
          lastName: "QA",
          email,
          phone: "+2348000000000",
          roomId: "guest-room",
          checkIn,
          checkOut,
          guests: 2,
          message: "Folio charges API test",
        }),
      },
    ),
  );

  assert.equal(res.status, 200);
  const body = (await res.json()) as { id: string; reservation: { status: string } };
  return body.id;
}

type ChargeBody = {
  ok?: boolean;
  error?: string;
  charge?: {
    id: string;
    reservationId: string;
    sku: string;
    name: string;
    qty: number;
    unitPriceNgn: number;
    status: string;
  };
  charges?: Array<{ id: string; reservationId: string; status: string }>;
};

async function getCharges(reservationId: string, key: string | null = "test-dashboard-key") {
  const { GET } = await import("@/app/api/staff/folio/charges/route");
  const url = key
    ? `http://localhost/api/staff/folio/charges?reservationId=${reservationId}&key=${key}`
    : `http://localhost/api/staff/folio/charges?reservationId=${reservationId}`;
  const res = await GET(new Request(url));
  const data = (await res.json()) as ChargeBody;
  return { res, data };
}

async function postCharge(body: unknown, key: string | null = "test-dashboard-key") {
  const { POST } = await import("@/app/api/staff/folio/charges/route");
  const url = key
    ? `http://localhost/api/staff/folio/charges?key=${key}`
    : "http://localhost/api/staff/folio/charges";
  const res = await POST(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  const data = (await res.json()) as ChargeBody;
  return { res, data };
}

async function patchCharge(
  id: string,
  status: string,
  key: string | null = "test-dashboard-key",
) {
  const { PATCH } = await import("@/app/api/staff/folio/charges/[id]/route");
  const url = key
    ? `http://localhost/api/staff/folio/charges/${id}?key=${key}`
    : `http://localhost/api/staff/folio/charges/${id}`;
  const res = await PATCH(
    new Request(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
    { params: Promise.resolve({ id }) },
  );
  const data = (await res.json()) as ChargeBody;
  return { res, data };
}

describe("Folio charges API (Agent K)", () => {
  before(() => {
    setTestEnv();
  });

  it("rejects GET without a valid staff key", async () => {
    const reservationId = await createPendingReservation();
    const { res } = await getCharges(reservationId, null);
    assert.equal(res.status, 401);
  });

  it("rejects POST without a valid staff key", async () => {
    const reservationId = await createPendingReservation();
    const { res } = await postCharge(
      { reservationId, sku: "minibar-water-500", qty: 1 },
      null,
    );
    assert.equal(res.status, 401);
  });

  it("rejects an unknown catalog sku", async () => {
    const reservationId = await createPendingReservation();
    const { res, data } = await postCharge({
      reservationId,
      sku: "not-a-real-sku",
      qty: 1,
    });
    assert.equal(res.status, 404);
    assert.ok(data.error);
  });

  it("creates an open charge snapshotting the catalog name + price", async () => {
    const reservationId = await createPendingReservation();
    const { res, data } = await postCharge({
      reservationId,
      sku: "minibar-chapman",
      qty: 2,
    });

    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.charge?.reservationId, reservationId);
    assert.equal(data.charge?.sku, "minibar-chapman");
    assert.equal(data.charge?.name, "Chapman Mocktail");
    assert.equal(data.charge?.qty, 2);
    assert.equal(data.charge?.unitPriceNgn, 3500);
    assert.equal(data.charge?.status, "open");
  });

  it("defaults qty to 1 when omitted", async () => {
    const reservationId = await createPendingReservation();
    const { res, data } = await postCharge({
      reservationId,
      sku: "snacks-chin-chin",
    });
    assert.equal(res.status, 200);
    assert.equal(data.charge?.qty, 1);
  });

  it("GET lists only charges for the requested reservation", async () => {
    const reservationA = await createPendingReservation();
    const reservationB = await createPendingReservation();

    await postCharge({ reservationId: reservationA, sku: "snacks-mixed-nuts", qty: 1 });
    await postCharge({ reservationId: reservationB, sku: "laundry-shirt", qty: 3 });

    const { res, data } = await getCharges(reservationA);
    assert.equal(res.status, 200);
    assert.ok(data.charges && data.charges.length >= 1);
    assert.ok(data.charges?.every((c) => c.reservationId === reservationA));
  });

  it("PATCH moves a charge open -> posted -> paid, stamping paidAt", async () => {
    const reservationId = await createPendingReservation();
    const created = await postCharge({
      reservationId,
      sku: "misc-towel-set",
      qty: 1,
    });
    const id = created.data.charge!.id;

    const posted = await patchCharge(id, "posted");
    assert.equal(posted.res.status, 200);
    assert.equal(posted.data.charge?.status, "posted");

    const paid = await patchCharge(id, "paid");
    assert.equal(paid.res.status, 200);
    assert.equal(paid.data.charge?.status, "paid");
  });

  it("PATCH can void an open charge directly", async () => {
    const reservationId = await createPendingReservation();
    const created = await postCharge({
      reservationId,
      sku: "misc-late-checkout",
      qty: 1,
    });
    const id = created.data.charge!.id;

    const voided = await patchCharge(id, "void");
    assert.equal(voided.res.status, 200);
    assert.equal(voided.data.charge?.status, "void");
  });

  it("PATCH rejects changing a terminal (paid/void) charge", async () => {
    const reservationId = await createPendingReservation();
    const created = await postCharge({
      reservationId,
      sku: "misc-airport-shuttle",
      qty: 1,
    });
    const id = created.data.charge!.id;
    await patchCharge(id, "void");

    const { res, data } = await patchCharge(id, "posted");
    assert.equal(res.status, 409);
    assert.ok(data.error);
  });

  it("PATCH 404s for an unknown charge id", async () => {
    const { res } = await patchCharge(randomUUID(), "posted");
    assert.equal(res.status, 404);
  });
});
