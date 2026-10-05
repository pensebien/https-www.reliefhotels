import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

/**
 * End to end against a fake RAYZA Connect v4.2 that behaves like the live
 * sandbox: it rewrites references not starting with "BK-", rejects bookings
 * without an amount, enforces occupancy and availability (409), and cancel
 * is idempotent (200) while unknown references 404.
 */
const KEY = "relief-demo-2026";
const BASE = "https://rayza.test";
const CHECK_IN = "2028-05-10";
const CHECK_OUT = "2028-05-12";

type FakeBooking = { ref: string; status: "active" | "cancelled"; body: Record<string, unknown>; checkIn: string; checkOut: string };

const fake = {
  numbers: ["501", "502", "503"],
  maxOccupancy: 3,
  /** Rooms the HMS front desk has taken for the test dates. */
  frontDesk: 0,
  forceConflict: false,
  down: false,
  bookings: new Map<string, FakeBooking>(),
  patches: [] as { ref: string; body: Record<string, unknown> }[],
  reset() {
    this.frontDesk = 0;
    this.forceConflict = false;
    this.down = false;
    this.bookings.clear();
    this.patches = [];
  },
  free(checkIn: string, checkOut: string) {
    const taken = [...this.bookings.values()].filter(
      (b) => b.status === "active" && b.checkIn < checkOut && b.checkOut > checkIn,
    ).length;
    return Math.max(0, this.numbers.length - this.frontDesk - taken);
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const rejected = (code: string, message: string, status: number) => json({ status: "rejected", error: { code, message } }, status);

async function fakeRayza(url: URL, init?: RequestInit): Promise<Response> {
  if (fake.down) throw new TypeError("fetch failed");
  assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-key");
  const method = init?.method ?? "GET";
  if (method === "GET" && url.pathname === "/v1/rooms") {
    const checkIn = url.searchParams.get("check_in");
    const checkOut = url.searchParams.get("check_out");
    const free = checkIn && checkOut ? fake.free(checkIn, checkOut) : fake.numbers.length;
    return json({
      currency: "NGN",
      rooms: [
        {
          room_type_identifier: "standard-deluxe",
          room_type_name: "Standard Deluxe",
          room_numbers: checkIn ? fake.numbers.slice(0, free) : fake.numbers,
          total_rooms: fake.numbers.length,
          available_count: free,
          available: free > 0,
          base_price: 46000,
          tax_exclusive_price: 46000,
          tax_inclusive_price: 49450,
          min_los: 1,
          capacity: { base_occupancy: 1, max_occupancy: fake.maxOccupancy },
          closed_to_arrival: false,
          closed_to_departure: false,
        },
      ],
    });
  }
  if (method === "POST" && url.pathname === "/v1/bookings") {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    if (body.amount === undefined) return rejected("VALIDATION_ERROR", "body -> amount: Field required", 422);
    if (body.room_identifier !== "standard-deluxe") return rejected("INVALID_ROOM_TYPE", "Room type not found", 422);
    if ((body.adults as number) > fake.maxOccupancy) return rejected("OCCUPANCY_LIMIT_EXCEEDED", "Too many guests", 422);
    const sent = String(body.booking_reference);
    const ref = sent.startsWith("BK-") ? sent : `BK-${sent.replace(/^([A-Za-z]+-)+/, "")}`;
    if (fake.bookings.has(ref)) return json({ status: "already_received", booking_reference: ref }, 200);
    if (fake.forceConflict || fake.free(String(body.check_in), String(body.check_out)) < 1) {
      return rejected("ROOM_UNAVAILABLE", "The selected room is no longer available for these dates.", 409);
    }
    fake.bookings.set(ref, { ref, status: "active", body, checkIn: String(body.check_in), checkOut: String(body.check_out) });
    return json({ status: "received", id: "x", booking_reference: ref }, 201);
  }
  const cancel = url.pathname.match(/^\/v1\/bookings\/(.+)\/cancel$/);
  if (method === "POST" && cancel) {
    const booking = fake.bookings.get(decodeURIComponent(cancel[1]));
    if (!booking) return rejected("NOT_FOUND", "Booking reference not found", 404);
    const was = booking.status;
    booking.status = "cancelled";
    return json({ status: was === "cancelled" ? "already_cancelled" : "cancelled" });
  }
  const patch = url.pathname.match(/^\/v1\/bookings\/(.+)$/);
  if (method === "PATCH" && patch) {
    const ref = decodeURIComponent(patch[1]);
    const booking = fake.bookings.get(ref);
    if (!booking || booking.status !== "active") return rejected("NOT_FOUND", "Active booking not found", 404);
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    fake.patches.push({ ref, body });
    Object.assign(booking.body, body);
    return json({ status: "updated" });
  }
  return json({ detail: "Not Found" }, 404);
}

const request = (url: string, body?: unknown, method = "POST") =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer cron-secret" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function book(guests = 2): Promise<string> {
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
      roomId: "guest-room",
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

async function staffSetStatus(id: string, status: "confirmed" | "cancelled") {
  const { PATCH } = await import("@/app/api/demo/reservations/[id]/route");
  const res = await PATCH(request(`http://localhost/x?key=${KEY}`, { status }, "PATCH"), { params: Promise.resolve({ id }) });
  assert.equal(res.status, 200);
  return (await res.json()) as { rayza: { ok: boolean; error?: string } | null };
}

const activeOnRayza = () => [...fake.bookings.values()].filter((b) => b.status === "active");

describe("RAYZA Connect sync", () => {
  const realFetch = globalThis.fetch;
  const saved: { setup?: unknown } = {};

  before(async () => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    process.env.RAYZA_CONNECT_ENABLED = "true";
    process.env.RAYZA_API_KEY = "test-key";
    process.env.RAYZA_BASE_URL = BASE;
    process.env.CRON_SECRET = "cron-secret";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input instanceof Request ? input.url : input));
      if (url.origin !== BASE) return realFetch(input, init);
      return fakeRayza(url, init);
    }) as typeof fetch;
    const { getRoomSetup } = await import("@/lib/room-setup");
    saved.setup = await getRoomSetup();
  });

  beforeEach(async () => {
    fake.reset();
    const { clearRayzaCache } = await import("@/lib/integrations/rayza-sync");
    clearRayzaCache();
  });

  after(async () => {
    globalThis.fetch = realFetch;
    const { saveRoomSetup } = await import("@/lib/room-setup");
    await saveRoomSetup(saved.setup);
    const { saveRayzaRoomLinks } = await import("@/lib/integrations/rayza-sync");
    await saveRayzaRoomLinks({ links: {} });
    delete process.env.RAYZA_CONNECT_ENABLED;
    delete process.env.RAYZA_API_KEY;
    delete process.env.RAYZA_BASE_URL;
  });

  it("links room types and copies RAYZA's room numbers into room setup", async () => {
    const route = await import("@/app/api/staff/settings/rayza/route");
    const notLinked = await route.POST(request(`http://localhost/x?key=${KEY}`, { action: "import", roomIds: ["guest-room"] }));
    assert.equal(notLinked.status, 400);

    const put = await route.PUT(request(`http://localhost/x?key=${KEY}`, { links: { "guest-room": "standard-deluxe" } }, "PUT"));
    assert.equal(put.status, 200);
    const dup = await route.PUT(
      request(`http://localhost/x?key=${KEY}`, { links: { "guest-room": "standard-deluxe", "executive-room": "standard-deluxe" } }, "PUT"),
    );
    assert.equal(dup.status, 400, "one RAYZA type can't back two Relief types");

    const overview = (await (await route.GET(request(`http://localhost/x?key=${KEY}`, undefined, "GET"))).json()) as {
      enabled: boolean;
      catalogue: { rooms: { id: string; totalRooms: number }[] };
    };
    assert.equal(overview.enabled, true);
    assert.deepEqual(overview.catalogue.rooms.map((r) => [r.id, r.totalRooms]), [["standard-deluxe", 3]]);

    const imported = await route.POST(request(`http://localhost/x?key=${KEY}`, { action: "import", roomIds: ["guest-room"] }));
    assert.equal(imported.status, 200);
    const { getRoomSetup } = await import("@/lib/room-setup");
    const guestRoom = (await getRoomSetup()).rooms.find((r) => r.roomId === "guest-room")!;
    assert.deepEqual([guestRoom.inventory, guestRoom.unitLabels], [3, ["501", "502", "503"]]);
  });

  it("only sells rooms RAYZA also has free (front-desk bookings count)", async () => {
    const { getRoomAvailability } = await import("@/lib/room-availability");
    const query = { checkIn: CHECK_IN, checkOut: CHECK_OUT, rooms: 1, guests: 2 };
    const open = await getRoomAvailability(query);
    assert.equal(open.available.find((r) => r.id === "guest-room")?.availableUnits, 3);

    fake.frontDesk = 2;
    const { clearRayzaCache } = await import("@/lib/integrations/rayza-sync");
    clearRayzaCache();
    assert.equal((await getRoomAvailability(query)).available.find((r) => r.id === "guest-room")?.availableUnits, 1);

    const tooMany = await getRoomAvailability({ ...query, guests: 4 });
    assert.equal(tooMany.restricted.find((r) => r.id === "guest-room")?.code, "over_capacity", "RAYZA sleeps 3");

    fake.frontDesk = 3;
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

  it("falls back to Relief's own inventory when RAYZA is unreachable", async () => {
    fake.down = true;
    const { getRoomAvailability } = await import("@/lib/room-availability");
    const result = await getRoomAvailability({ checkIn: CHECK_IN, checkOut: CHECK_OUT, rooms: 1, guests: 2 });
    assert.ok(result.available.some((r) => r.id === "guest-room"));
  });

  it("pushes a confirmed booking, moves its room, and releases it on cancel", async () => {
    const id = await book(2);
    assert.equal(activeOnRayza().length, 0, "unpaid holds aren't sent to RAYZA");

    const confirmed = await staffSetStatus(id, "confirmed");
    assert.deepEqual(confirmed.rayza?.ok, true);
    const [pushed] = activeOnRayza();
    assert.match(pushed.ref, /^BK-RH-[0-9A-F]{12}$/);
    assert.equal(pushed.ref, pushed.body.booking_reference, "RAYZA kept our reference");
    assert.equal(pushed.body.room_identifier, "standard-deluxe");
    assert.equal(pushed.body.adults, 2);
    assert.equal(pushed.body.payment_status, "unpaid");
    assert.ok((pushed.body.amount as number) > 0);
    assert.equal(pushed.body.room_number, "501", "the room Relief assigned");

    // Pushing again is a no-op on RAYZA's side.
    const { findReservationById } = await import("@/lib/demo-store");
    const { pushReservationToRayza } = await import("@/lib/integrations/rayza-sync");
    assert.equal((await pushReservationToRayza((await findReservationById(id))!)).ok, true);
    assert.equal(fake.bookings.size, 1);

    const { PUT } = await import("@/app/api/staff/reservations/[id]/rooms/route");
    const moved = await PUT(request(`http://localhost/x?key=${KEY}`, { unitIds: ["guest-room-2"] }, "PUT"), {
      params: Promise.resolve({ id }),
    });
    assert.equal(moved.status, 200);
    assert.deepEqual(fake.patches, [{ ref: pushed.ref, body: { room_number: "502" } }]);

    const cancelled = await staffSetStatus(id, "cancelled");
    assert.deepEqual(cancelled.rayza?.ok, true);
    assert.equal(fake.bookings.get(pushed.ref)?.status, "cancelled");

    const { getSyncRows } = await import("@/lib/integrations/rayza-sync");
    assert.equal((await getSyncRows([id])).get(id)?.state, "cancelled");
  });

  it("releases the room when the guest cancels online", async () => {
    const id = await book(1);
    await staffSetStatus(id, "confirmed");
    assert.equal(activeOnRayza().length, 1);

    const { signReservationId } = await import("@/lib/booking-engine/manage-link");
    const { POST: cancel } = await import("@/app/api/booking/manage/cancel/route");
    const res = await cancel(request("http://localhost/api/booking/manage/cancel", { id, t: signReservationId(id) }));
    assert.equal(res.status, 200);
    assert.equal(activeOnRayza().length, 0);
  });

  it("flags a booking RAYZA refuses and the scheduled sync pushes it later", async () => {
    const id = await book(2);
    fake.forceConflict = true;
    const result = await staffSetStatus(id, "confirmed");
    assert.equal(result.rayza?.ok, false);

    const { findReservationById } = await import("@/lib/demo-store");
    const record = (await findReservationById(id))!;
    assert.equal(record.status, "confirmed", "Relief keeps the guest's booking");
    assert.match(record.staffNotes ?? "", /RAYZA HMS did not accept this booking \(ROOM_UNAVAILABLE\)/);

    const { getSyncRows } = await import("@/lib/integrations/rayza-sync");
    assert.equal((await getSyncRows([id])).get(id)?.state, "failed");

    fake.forceConflict = false;
    const { POST: cron } = await import("@/app/api/cron/rayza/route");
    const run = (await (await cron(request("http://localhost/api/cron/rayza"))).json()) as { summary: { pushed: number } };
    assert.equal(run.summary.pushed, 1, "only the failed booking; demo and pre-link bookings aren't backfilled");
    assert.equal((await getSyncRows([id])).get(id)?.state, "pushed");
    assert.equal(activeOnRayza().length, 1);

    // Clean up so later runs start empty.
    await staffSetStatus(id, "cancelled");
  });

  it("refuses the cron without the secret", async () => {
    const { POST: cron } = await import("@/app/api/cron/rayza/route");
    const res = await cron(new Request("http://localhost/api/cron/rayza", { method: "POST", headers: { Authorization: "Bearer wrong!" } }));
    assert.equal(res.status, 401);
  });

  it("does nothing when RAYZA Connect is off", async () => {
    process.env.RAYZA_CONNECT_ENABLED = "false";
    try {
      const id = await book(1);
      const result = await staffSetStatus(id, "confirmed");
      assert.equal(result.rayza, null);
      assert.equal(fake.bookings.size, 0);
      await staffSetStatus(id, "cancelled");
    } finally {
      process.env.RAYZA_CONNECT_ENABLED = "true";
    }
  });
});
