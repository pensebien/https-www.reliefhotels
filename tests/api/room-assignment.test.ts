import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

const KEY = "relief-demo-2026";

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.NOTIFY_CHANNEL = "console";
  process.env.STAFF_AUTH_ENABLED = "false";
  delete process.env.DEMO_DASHBOARD_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function stay() {
  const base = new Date(Date.UTC(2034, 0, 1 + (Math.floor(Date.now() / 1000) % 3000)));
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  return { checkIn: base.toISOString().slice(0, 10), checkOut: out.toISOString().slice(0, 10) };
}

async function book(roomId: string, dates: { checkIn: string; checkOut: string }, extra: Record<string, unknown> = {}) {
  const { POST } = await import("@/app/api/reservations/route");
  const res = await POST(new Request("http://localhost/api/reservations", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Assign", lastName: "Test", email: `as-${Date.now()}@example.com`, phone: "+2348000000000",
      stayPreference: "t", message: "t", itemType: "room", roomId, guests: 2, nights: 2, ...dates, ...extra,
    }),
  }));
  assert.equal(res.status, 200);
  return ((await res.json()) as { id: string }).id;
}

describe("Room assignment API", () => {
  before(setTestEnv);

  it("auto-assigns new bookings to different rooms and lets staff move them", async () => {
    const dates = stay();
    const first = await book("executive-room", dates);
    const second = await book("executive-room", dates, { rooms: 2, guests: 3 });

    const { findReservationById } = await import("@/lib/demo-store");
    const a = await findReservationById(first);
    const b = await findReservationById(second);
    assert.equal(a?.assignedUnits?.length, 1);
    assert.equal(b?.assignedUnits?.length, 2);
    assert.equal(new Set([...a!.assignedUnits!, ...b!.assignedUnits!]).size, 3, "no room shared");

    const { GET, PUT } = await import("@/app/api/staff/reservations/[id]/rooms/route");
    const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
    const url = (id: string) => `http://localhost/api/staff/reservations/${id}/rooms?key=${KEY}`;
    const put = (id: string, body: unknown) =>
      PUT(new Request(url(id), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), ctx(id));

    const options = (await (await GET(new Request(url(first)), ctx(first))).json()) as {
      rooms: { unitId: string; label: string; free: boolean }[];
    };
    const takenByB = b!.assignedUnits![0];
    assert.equal(options.rooms.find((r) => r.unitId === takenByB)?.free, false);

    const clash = await put(first, { unitIds: [takenByB] });
    assert.equal(clash.status, 409);

    const freeRoom = options.rooms.find((r) => r.free && !a!.assignedUnits!.includes(r.unitId))!;
    const moved = await put(first, { unitIds: [freeRoom.unitId] });
    assert.equal(moved.status, 200);
    assert.deepEqual((await findReservationById(first))?.assignedUnits, [freeRoom.unitId]);

    assert.equal((await put(second, { unitIds: [freeRoom.unitId] })).status, 422, "2-room booking needs 2 rooms");
    assert.equal((await put(first, { auto: true })).status, 200);
  });
});
