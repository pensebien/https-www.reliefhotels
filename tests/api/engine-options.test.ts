import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { after, before, describe, it } from "node:test";
import { dataPath } from "@/lib/data-dir";

const KEY = "relief-demo-2026";
const json = (url: string, body: unknown, method = "POST") =>
  new Request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function inDays(n: number) {
  const d = new Date(Date.now() + 3_600_000);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function setEngine(engine: Record<string, unknown>) {
  const { saveRateConfig, DEFAULT_RATE_CONFIG } = await import("@/lib/booking-engine/rate-config");
  await saveRateConfig({ ...DEFAULT_RATE_CONFIG, engine: { ...DEFAULT_RATE_CONFIG.engine, ...engine } });
}

async function book(extra: Record<string, unknown> = {}, offset = 30) {
  const { POST } = await import("@/app/api/reservations/route");
  const res = await POST(json("http://localhost/api/reservations", {
    firstName: "Eng", lastName: "Ine", email: `eng-${Date.now()}@example.com`, phone: "+2348000000000",
    stayPreference: "t", message: "Quiet room please", itemType: "room", roomId: "guest-room", guests: 2, nights: 2,
    checkIn: inDays(offset), checkOut: inDays(offset + 2), ...extra,
  }));
  return { res, data: (await res.json()) as Record<string, unknown> };
}

describe("Booking engine options", () => {
  before(() => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    delete process.env.DEMO_DASHBOARD_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
  after(async () => {
    await fs.rm(dataPath("rate-config.json"), { force: true });
    const { clearRateConfigCache } = await import("@/lib/booking-engine/rate-config");
    clearRateConfigCache();
  });

  it("request mode: no payment hold, staff approve, the guest's deposit is then due", async () => {
    await setEngine({ mode: "request" });
    const { res, data } = await book();
    assert.equal(res.status, 200);
    assert.equal(data.requiresApproval, true);
    const { findReservationById } = await import("@/lib/demo-store");
    const record = (await findReservationById(data.id as string))!;
    assert.equal(record.status, "pending");
    assert.equal(record.holdExpiresAt, undefined, "requests hold the room until staff decide");

    const { PATCH } = await import("@/app/api/demo/reservations/[id]/route");
    const approved = await PATCH(json(`http://localhost/x?key=${KEY}`, { status: "confirmed" }, "PATCH"), { params: Promise.resolve({ id: record.id }) });
    assert.equal(approved.status, 200);

    const { signReservationId } = await import("@/lib/booking-engine/manage-link");
    const { GET } = await import("@/app/api/booking/manage/route");
    const view = (await (await GET(new Request(`http://localhost/x?id=${record.id}&t=${signReservationId(record.id)}`))).json()) as {
      booking: { status: string; amountDueKind: string };
    };
    assert.equal(view.booking.status, "confirmed");
    assert.equal(view.booking.amountDueKind, "deposit");
  });

  it("enforces the booking window online and explains it in availability", async () => {
    await setEngine({ mode: "instant", maxDaysAhead: 10 });
    const far = await book({}, 40);
    assert.equal(far.res.status, 422);
    assert.equal(far.data.code, "booking_window");
    const { GET } = await import("@/app/api/rooms/availability/route");
    const av = (await (await GET(new Request(`http://localhost/x?checkIn=${inDays(40)}&checkOut=${inDays(42)}&guests=2`))).json()) as {
      restricted: { code: string }[];
    };
    assert.ok(av.restricted.length > 0 && av.restricted.every((r) => r.code === "booking_window"));
  });

  it("requires the arrival time when set, and keeps it with the booking", async () => {
    await setEngine({ mode: "instant", arrivalTimeField: "required" });
    assert.equal((await book({}, 5)).res.status, 400);
    const ok = await book({ arrivalTime: "16:45" }, 6);
    assert.equal(ok.res.status, 200);
    const { findReservationById } = await import("@/lib/demo-store");
    assert.match((await findReservationById(ok.data.id as string))!.message, /^Estimated arrival: 16:45/);
  });
});
