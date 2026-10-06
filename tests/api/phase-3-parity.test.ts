import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { after, before, describe, it } from "node:test";
import { dataPath } from "@/lib/data-dir";

const KEY = "relief-demo-2026";
const json = (url: string, body?: unknown, method = "POST") =>
  new Request(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

function inDays(n: number) {
  const d = new Date(Date.now() + 3_600_000);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function setConfig(change: Record<string, unknown>) {
  const { saveRateConfig, DEFAULT_RATE_CONFIG } = await import("@/lib/booking-engine/rate-config");
  await saveRateConfig({ ...DEFAULT_RATE_CONFIG, ...change });
}

async function book(extra: Record<string, unknown> = {}, offset = 200) {
  const { POST } = await import("@/app/api/reservations/route");
  const res = await POST(json("http://localhost/api/reservations", {
    firstName: "Par", lastName: "Ity", email: `parity-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
    phone: "+2348000000000", stayPreference: "t", message: "t", itemType: "room", roomId: "guest-room",
    guests: 2, nights: 2, checkIn: inDays(offset), checkOut: inDays(offset + 2), ...extra,
  }));
  return { res, data: (await res.json()) as Record<string, unknown> };
}

describe("Phase 3 parity", () => {
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

  it("staff tag bookings; tags are cleaned and saved", async () => {
    const { data } = await book();
    const { PATCH } = await import("@/app/api/demo/reservations/[id]/route");
    const res = await PATCH(json(`http://localhost/x?key=${KEY}`, { tags: [" VIP ", "VIP", "", "late arrival"] }, "PATCH"), {
      params: Promise.resolve({ id: data.id as string }),
    });
    assert.equal(res.status, 200);
    const { findReservationById } = await import("@/lib/demo-store");
    assert.deepEqual((await findReservationById(data.id as string))?.tags, ["VIP", "late arrival"]);
  });

  it("rate calendar shows price and rooms left, and edits prices / stop sale", async () => {
    await setConfig({});
    const route = await import("@/app/api/staff/rate-calendar/route");
    const from = inDays(300);
    const get = async () =>
      (await (await route.GET(json(`http://localhost/x?from=${from}&days=3&key=${KEY}`, undefined, "GET"))).json()) as {
        days: string[];
        rooms: { roomId: string; inventory: number; cells: { nightlyNgn: number; free: number; closed: boolean }[] }[];
      };
    const cal = await get();
    assert.equal(cal.days.length, 3);
    const guest = cal.rooms.find((r) => r.roomId === "guest-room")!;
    assert.equal(guest.cells[0].free, guest.inventory);

    const bad = await route.POST(json(`http://localhost/x?key=${KEY}`, { roomId: "guest-room", from, to: from }));
    assert.equal(bad.status, 400);
    const set = await route.POST(json(`http://localhost/x?key=${KEY}`, { roomId: "guest-room", from, to: inDays(302), nightlyNgn: 77_000, closed: true }));
    assert.equal(set.status, 200);
    const after = (await get()).rooms.find((r) => r.roomId === "guest-room")!;
    assert.deepEqual(after.cells.map((c) => [c.nightlyNgn, c.closed]), [[77_000, true], [77_000, true], [after.cells[2].nightlyNgn, false]]);

    const tooLong = await route.GET(json(`http://localhost/x?from=${from}&days=90&key=${KEY}`, undefined, "GET"));
    assert.equal(tooLong.status, 400);
  });

  it("an extra with a daily stock sells out", async () => {
    const { DEFAULT_RATE_CONFIG } = await import("@/lib/booking-engine/rate-config");
    await setConfig({
      extras: [...DEFAULT_RATE_CONFIG.extras, { id: "pickup", label: "Airport pickup", priceNgn: 20_000, pricing: "per_stay", active: true, stockPerDay: 1 }],
    });
    const first = await book({ extraIds: ["pickup"] }, 320);
    assert.equal(first.res.status, 200, String(first.data.error));
    const second = await book({ extraIds: ["pickup"] }, 321);
    assert.equal(second.res.status, 409);
    assert.match(String(second.data.error), /Airport pickup is fully booked/);
    const without = await book({}, 321);
    assert.equal(without.res.status, 200, "the room itself is still bookable");

    const { POST: quote } = await import("@/app/api/booking/quote/route");
    const q = await quote(json("http://localhost/api/booking/quote", {
      roomId: "guest-room", checkIn: inDays(321), checkOut: inDays(323), guests: 2, extraIds: ["pickup"],
    }));
    assert.equal(((await q.json()) as { code: string }).code, "extra_sold_out", "guests see it before paying");
  });

  it("a pay-at-hotel coupon confirms the booking with nothing to pay", async () => {
    await setConfig({ coupons: [{ code: "PAYLATER", skipDeposit: true, active: true }] });
    const { res, data } = await book({ couponCode: "PAYLATER" }, 340);
    assert.equal(res.status, 200, String(data.error));
    assert.equal(data.noPaymentNeeded, true);
    assert.equal(data.depositNgn, 0);
    const { findReservationById } = await import("@/lib/demo-store");
    assert.equal((await findReservationById(data.id as string))?.status, "confirmed");

    const normal = await book({}, 342);
    assert.equal(normal.data.noPaymentNeeded, false);
  });

  it("serves analytics IDs only when set", async () => {
    const { GET } = await import("@/app/api/site/analytics/route");
    await setConfig({});
    assert.deepEqual(await (await GET()).json(), { gaMeasurementId: null, metaPixelId: null });
    const { DEFAULT_RATE_CONFIG } = await import("@/lib/booking-engine/rate-config");
    await setConfig({ engine: { ...DEFAULT_RATE_CONFIG.engine, analytics: { gaMeasurementId: "G-TEST1234" } } });
    assert.deepEqual(await (await GET()).json(), { gaMeasurementId: "G-TEST1234", metaPixelId: null });
  });
});
