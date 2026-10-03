import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

const KEY = "relief-demo-2026";
const ctx = <T extends string>(name: T, value: string) => ({ params: Promise.resolve({ [name]: value } as Record<T, string>) });

describe("Housekeeping board API", () => {
  before(() => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    delete process.env.DEMO_DASHBOARD_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("check-out marks the room dirty with a hold; cleaning releases it; tasks can be ticked", async () => {
    const today = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
    const twoAgo = new Date(Date.parse(`${today}T00:00:00Z`) - 2 * 86_400_000).toISOString().slice(0, 10);
    const { addReservation } = await import("@/lib/demo-store");
    const stay = await addReservation({
      firstName: "Hk", lastName: "Guest", email: "hk@example.com", itemType: "room", roomId: "signature-suite",
      checkIn: twoAgo, checkOut: today, nights: 2, guests: 2, stayPreference: "t", message: "t", emailSent: false,
      status: "confirmed", assignedUnits: ["signature-suite-2"],
    });

    const { PATCH } = await import("@/app/api/demo/reservations/[id]/route");
    const out = await PATCH(new Request(`http://localhost/x?key=${KEY}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "checked_out" }),
    }), ctx("id", stay.id));
    assert.equal(out.status, 200);

    const { listRoomStatus } = await import("@/lib/housekeeping/store");
    const status = (await listRoomStatus()).find((r) => r.unitId === "signature-suite-2");
    assert.equal(status?.status, "dirty");
    assert.ok(status?.blockId, "check-out hold linked to the room");

    const { GET } = await import("@/app/api/staff/housekeeping/board/route");
    const board = (await (await GET(new Request(`http://localhost/x?key=${KEY}&date=${today}`))).json()) as {
      rooms: { unitId: string; movement: string; status: string; tasks: { id: string }[] }[];
    };
    const room = board.rooms.find((r) => r.unitId === "signature-suite-2")!;
    assert.equal(room.status, "dirty");
    assert.ok(["departing", "turnover"].includes(room.movement));
    assert.ok(room.tasks.some((t) => t.id === "departure-clean"));

    const { PUT: tick } = await import("@/app/api/staff/housekeeping/tasks/route");
    assert.equal((await tick(new Request(`http://localhost/x?key=${KEY}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId: "signature-suite-2", taskId: "departure-clean", date: today, done: true }),
    }))).status, 200);

    const { PUT: mark } = await import("@/app/api/staff/housekeeping/rooms/[unitId]/route");
    assert.equal((await mark(new Request(`http://localhost/x?key=${KEY}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "clean" }),
    }), ctx("unitId", "nope-1"))).status, 404);
    const cleaned = await mark(new Request(`http://localhost/x?key=${KEY}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "clean" }),
    }), ctx("unitId", "signature-suite-2"));
    assert.equal(cleaned.status, 200);

    const { listRoomBlocks } = await import("@/lib/db/inventory-store");
    assert.equal((await listRoomBlocks()).some((b) => b.id === status!.blockId), false, "hold released");
    const after = (await (await GET(new Request(`http://localhost/x?key=${KEY}&date=${today}`))).json()) as {
      rooms: { unitId: string; status: string; tasks: { id: string; done: boolean }[] }[];
    };
    const r2 = after.rooms.find((r) => r.unitId === "signature-suite-2")!;
    assert.equal(r2.status, "clean");
    assert.equal(r2.tasks.find((t) => t.id === "departure-clean")?.done, true);
  });
});
