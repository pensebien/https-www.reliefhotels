import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { fakeRayza, installFakeRayza, resetFakeRayza, uninstallFakeRayza } from "../helpers/fake-rayza";

/** End to end: website booking → payment recorded by staff → RAYZA, and back out on cancel. */
const KEY = "relief-demo-2026";
const CHECK_IN = "2028-05-10";
const CHECK_OUT = "2028-05-12";

const request = (url: string, body?: unknown, method = "POST") =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer cron-secret" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function book(guests = 2, roomId = "guest-room"): Promise<string> {
  const { POST } = await import("@/app/api/reservations/route");
  const res = await POST(
    request("http://localhost/api/reservations", {
      firstName: "Rayza",
      lastName: "Guest",
      email: `rayza-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
      phone: "+2348012345678",
      stayPreference: "t",
      message: "t",
      itemType: "room",
      roomId,
      guests,
      nights: 2,
      checkIn: CHECK_IN,
      checkOut: CHECK_OUT,
    }),
  );
  const body = (await res.json()) as { id?: string; error?: string; details?: unknown };
  assert.equal(res.status, 200, `${body.error} ${JSON.stringify(body.details)}`);
  return body.id!;
}

async function ops(action: string, reservationId: string, extra: Record<string, unknown> = {}) {
  const { POST } = await import("@/app/api/staff/ops/route");
  const res = await POST(request(`http://localhost/api/staff/ops?key=${KEY}`, { action, reservationId, ...extra }));
  return { status: res.status, body: (await res.json()) as { message?: string; error?: string } };
}

describe("RAYZA Connect sync", () => {
  before(async () => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    process.env.CRON_SECRET = "cron-secret";
    delete process.env.DEMO_DASHBOARD_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await installFakeRayza();
  });

  beforeEach(resetFakeRayza);

  after(uninstallFakeRayza);

  it("manager links room types; one RAYZA type can't back two room types", async () => {
    const route = await import("@/app/api/staff/settings/rayza/route");
    const dup = await route.PUT(
      request(`http://localhost/x?key=${KEY}`, { links: { "guest-room": "guest-room", "executive-room": "guest-room" } }, "PUT"),
    );
    assert.equal(dup.status, 400);

    const overview = (await (await route.GET(request(`http://localhost/x?key=${KEY}`, undefined, "GET"))).json()) as {
      enabled: boolean;
      links: Record<string, string>;
      catalogue: { rooms: { id: string; totalRooms: number }[] };
    };
    assert.equal(overview.enabled, true);
    assert.equal(overview.links["guest-room"], "guest-room");
    assert.equal(overview.catalogue.rooms.find((r) => r.id === "guest-room")?.totalRooms, 3);
  });

  it("only sells rooms RAYZA has free (front-desk and OTA bookings count)", async () => {
    const { getRoomAvailability } = await import("@/lib/room-availability");
    const { clearRayzaCache } = await import("@/lib/integrations/rayza-sync");
    const query = { checkIn: CHECK_IN, checkOut: CHECK_OUT, rooms: 1, guests: 2 };
    const open = await getRoomAvailability(query);
    const free = open.available.find((r) => r.id === "guest-room")!.availableUnits;

    fakeRayza.frontDesk["guest-room"] = 2;
    clearRayzaCache();
    assert.equal((await getRoomAvailability(query)).available.find((r) => r.id === "guest-room")?.availableUnits, free - 2);

    fakeRayza.frontDesk["guest-room"] = 3;
    clearRayzaCache();
    assert.equal((await getRoomAvailability(query)).available.some((r) => r.id === "guest-room"), false);
    const { POST } = await import("@/app/api/reservations/route");
    const res = await POST(
      request("http://localhost/api/reservations", {
        firstName: "Late", lastName: "Guest", email: "late@example.com", phone: "+2348012345678",
        stayPreference: "t", message: "t", itemType: "room", roomId: "guest-room", guests: 2, nights: 2,
        checkIn: CHECK_IN, checkOut: CHECK_OUT,
      }),
    );
    assert.equal(res.status, 409, "the booking write path re-checks RAYZA live");
  });

  it("a transfer staff record confirms the booking and sends it to RAYZA; cancel releases it", async () => {
    const id = await book(2, "signature-suite");
    assert.equal(fakeRayza.active().length, 0, "unpaid holds aren't sent to RAYZA");

    const paid = await ops("record_transfer", id, { amountNgn: 80_000 });
    assert.equal(paid.status, 200, paid.body.error);
    const [pushed] = fakeRayza.active();
    assert.match(pushed.ref, /^BK-RH-[0-9A-F]{12}$/);
    assert.equal(pushed.body.room_identifier, "signature-suite");
    assert.equal(pushed.body.adults, 2);
    assert.equal(pushed.body.deposit_paid, 80_000);
    assert.equal(pushed.body.room_number, undefined, "RAYZA assigns the room");

    // Pushing again is a no-op on RAYZA's side.
    const again = await ops("retry_rayza", id);
    assert.equal(again.status, 200);
    assert.equal(fakeRayza.bookings.size, 1);

    const cancelled = await ops("cancel", id);
    assert.equal(cancelled.status, 200);
    assert.equal(fakeRayza.bookings.get(pushed.ref)?.status, "cancelled");
    const { getSyncRows } = await import("@/lib/integrations/rayza-sync");
    assert.equal((await getSyncRows([id])).get(id)?.state, "cancelled");
  });

  it("releases the room when the guest cancels online", async () => {
    const id = await book(1, "executive-room");
    await ops("record_transfer", id, { amountNgn: 26_000 });
    assert.equal(fakeRayza.active().length, 1);

    const { signReservationId } = await import("@/lib/booking-engine/manage-link");
    const { POST: cancel } = await import("@/app/api/booking/manage/cancel/route");
    const res = await cancel(request("http://localhost/api/booking/manage/cancel", { id, t: signReservationId(id) }));
    assert.equal(res.status, 200);
    assert.equal(fakeRayza.active().length, 0);
  });

  it("flags a booking RAYZA refuses and the scheduled sync pushes it later", async () => {
    const id = await book(2, "presidential-suite");
    fakeRayza.forceConflict = true;
    await ops("record_transfer", id, { amountNgn: 80_000 });

    const { findReservationById } = await import("@/lib/demo-store");
    const record = (await findReservationById(id))!;
    assert.equal(record.status, "confirmed", "the website keeps the guest's paid booking");
    assert.match(record.staffNotes ?? "", /RAYZA HMS did not accept this booking \(ROOM_UNAVAILABLE\)/);

    const { getSyncRows } = await import("@/lib/integrations/rayza-sync");
    assert.equal((await getSyncRows([id])).get(id)?.state, "failed");

    fakeRayza.forceConflict = false;
    const { POST: cron } = await import("@/app/api/cron/rayza/route");
    const run = (await (await cron(request("http://localhost/api/cron/rayza"))).json()) as { summary: { pushed: number } };
    assert.ok(run.summary.pushed >= 1);
    assert.equal((await getSyncRows([id])).get(id)?.state, "pushed");

    await ops("cancel", id);
  });

  it("refuses the cron without the secret", async () => {
    const { POST: cron } = await import("@/app/api/cron/rayza/route");
    const res = await cron(new Request("http://localhost/api/cron/rayza", { method: "POST", headers: { Authorization: "Bearer wrong!" } }));
    assert.equal(res.status, 401);
  });

  it("staff actions need the dashboard key", async () => {
    const { POST } = await import("@/app/api/staff/ops/route");
    const res = await POST(request("http://localhost/api/staff/ops?key=wrong", { action: "cancel", reservationId: "x" }));
    assert.equal(res.status, 401);
  });
});
