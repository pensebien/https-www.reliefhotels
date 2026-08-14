import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.DEMO_DASHBOARD_KEY = "test-dashboard-key";
  process.env.NOTIFY_CHANNEL = "console";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
  delete process.env.STAFF_AUTH_ENABLED;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.MONIEPOINT_CLIENT_ID;
}

/** Unique far-future stay dates so inventory from prior runs does not collide. */
function stayDates() {
  const offset = Math.floor(Date.now() / 1000) % 200;
  const base = new Date(Date.UTC(2032, 2, 1 + offset));
  const checkIn = base.toISOString().slice(0, 10);
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  const checkOut = out.toISOString().slice(0, 10);
  return { checkIn, checkOut };
}

async function createConfirmedWalkIn() {
  const { POST } = await import("@/app/api/demo/reservations/route");
  const { checkIn, checkOut } = stayDates();
  const res = await POST(
    new Request("http://localhost/api/demo/reservations?key=test-dashboard-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Check",
        lastName: "Out",
        email: `checkout-${Date.now()}@example.com`,
        phone: "+2348011110000",
        roomId: "guest-room",
        checkIn,
        checkOut,
        guests: 1,
        message: "checkout test",
        status: "confirmed",
        paymentMethod: "cash",
      }),
    }),
  );
  const body = await res.json();
  return body.id as string;
}

describe("staff checkout -> housekeeping hand-off", () => {
  before(() => {
    setTestEnv();
  });

  it("rejects checkout from a pending reservation", async () => {
    const { POST: create } = await import("@/app/api/demo/reservations/route");
    const { checkIn, checkOut } = stayDates();
    const createRes = await create(
      new Request("http://localhost/api/demo/reservations?key=test-dashboard-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Pending",
          lastName: "Guest",
          email: "pending-checkout@example.com",
          phone: "+2348022220000",
          roomId: "guest-room",
          checkIn,
          checkOut,
          guests: 1,
          message: "checkout test",
          status: "pending",
          paymentMethod: "none",
        }),
      }),
    );
    const created = await createRes.json();

    const { PATCH } = await import("@/app/api/demo/reservations/[id]/route");
    const res = await PATCH(
      new Request(
        `http://localhost/api/demo/reservations/${created.id}?key=test-dashboard-key`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "checked_out" }),
        },
      ),
      { params: Promise.resolve({ id: created.id }) },
    );
    assert.equal(res.status, 409);
  });

  it("checks out a confirmed reservation and blocks the room for housekeeping", async () => {
    const reservationId = await createConfirmedWalkIn();

    const { PATCH } = await import("@/app/api/demo/reservations/[id]/route");
    const res = await PATCH(
      new Request(
        `http://localhost/api/demo/reservations/${reservationId}?key=test-dashboard-key`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "checked_out" }),
        },
      ),
      { params: Promise.resolve({ id: reservationId }) },
    );
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.reservation.status, "checked_out");
    assert.ok(body.housekeeping);
    assert.equal(body.housekeeping.roomId, "guest-room");
    assert.equal(body.housekeeping.blockType, "housekeeping");

    const { GET: listBlocks } = await import("@/app/api/staff/room-blocks/route");
    const listRes = await listBlocks(
      new Request("http://localhost/api/staff/room-blocks?key=test-dashboard-key"),
    );
    const listed = await listRes.json();
    const found = listed.blocks.find((b: { id: string }) => b.id === body.housekeeping.id);
    assert.ok(found, "the auto-created housekeeping block should be listed");

    const { DELETE: deleteBlock } = await import(
      "@/app/api/staff/room-blocks/[id]/route"
    );
    const cleanupRes = await deleteBlock(
      new Request(
        `http://localhost/api/staff/room-blocks/${body.housekeeping.id}?key=test-dashboard-key`,
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ id: body.housekeeping.id }) },
    );
    assert.equal(cleanupRes.status, 200);
  });

  it("rejects a second checkout of an already checked-out reservation", async () => {
    const reservationId = await createConfirmedWalkIn();

    const { PATCH } = await import("@/app/api/demo/reservations/[id]/route");
    const first = await PATCH(
      new Request(
        `http://localhost/api/demo/reservations/${reservationId}?key=test-dashboard-key`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "checked_out" }),
        },
      ),
      { params: Promise.resolve({ id: reservationId }) },
    );
    const firstBody = await first.json();

    const second = await PATCH(
      new Request(
        `http://localhost/api/demo/reservations/${reservationId}?key=test-dashboard-key`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "checked_out" }),
        },
      ),
      { params: Promise.resolve({ id: reservationId }) },
    );
    assert.equal(second.status, 409);

    const { DELETE: deleteBlock } = await import(
      "@/app/api/staff/room-blocks/[id]/route"
    );
    await deleteBlock(
      new Request(
        `http://localhost/api/staff/room-blocks/${firstBody.housekeeping.id}?key=test-dashboard-key`,
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ id: firstBody.housekeeping.id }) },
    );
  });
});
