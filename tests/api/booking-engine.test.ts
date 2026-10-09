import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { fakeRayza, installFakeRayza, resetFakeRayza, uninstallFakeRayza } from "../helpers/fake-rayza";

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.NOTIFY_CHANNEL = "console";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
  process.env.STAFF_AUTH_ENABLED = "false";
  delete process.env.DEMO_DASHBOARD_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.BOOKING_DEPOSIT_PCT;
}

/** Unique far-future dates per call so earlier runs' bookings never collide. */
let dateSeq = 0;
function uniqueStay(nights = 2) {
  const offset = (Math.floor(Date.now() / 1000) % 3000) * 3 + dateSeq++ * 7;
  const base = new Date(Date.UTC(2031, 0, 1 + offset));
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + nights);
  return { checkIn: base.toISOString().slice(0, 10), checkOut: out.toISOString().slice(0, 10) };
}

function json(url: string, body: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function reservationBody(overrides: Record<string, unknown>) {
  return {
    firstName: "Engine",
    lastName: "QA",
    email: `engine-${Date.now()}@example.com`,
    phone: "+2348000000000",
    stayPreference: "booking engine test",
    message: "Automated booking-engine test",
    itemType: "room",
    guests: 2,
    nights: 1, // deliberately wrong — the server must derive nights itself
    ...overrides,
  };
}

async function reserve(overrides: Record<string, unknown>) {
  const { POST } = await import("@/app/api/reservations/route");
  const res = await POST(json("http://localhost/api/reservations", reservationBody(overrides)));
  return { res, data: (await res.json()) as Record<string, unknown> };
}

describe("Booking engine API (RAYZA prices and availability)", () => {
  before(async () => {
    setTestEnv();
    await installFakeRayza();
  });

  beforeEach(resetFakeRayza);

  after(uninstallFakeRayza);

  it("only one of two simultaneous bookings gets the last room", async () => {
    const stay = uniqueStay();
    const [a, b] = await Promise.all([
      reserve({ roomId: "presidential-suite", ...stay }),
      reserve({ roomId: "presidential-suite", ...stay }),
    ]);
    assert.deepEqual([a.res.status, b.res.status].sort(), [200, 409]);
  });

  it("rejects parties over RAYZA's occupancy with a clear code", async () => {
    const { res, data } = await reserve({ roomId: "executive-room", guests: 3, ...uniqueStay() });
    assert.equal(res.status, 422);
    assert.equal(data.code, "over_capacity");
  });

  it("prices from RAYZA's tax-inclusive rate and charges the server-quoted deposit", async () => {
    const { res, data } = await reserve({ roomId: "guest-room", guests: 3, rooms: 2, ...uniqueStay(3) });
    assert.equal(res.status, 200, JSON.stringify(data));
    // ₦50,000 a night (tax inclusive) × 3 nights × 2 rooms.
    assert.equal(data.totalNgn, 300_000);
    assert.equal(data.depositNgn, 60_000);

    const { findReservationById } = await import("@/lib/demo-store");
    const record = await findReservationById(data.id as string);
    assert.equal(record?.nights, 3);
    assert.equal(record?.units, 2);

    const { POST: initPayment } = await import("@/app/api/paystack/initialize/route");
    const initRes = await initPayment(
      json("http://localhost/api/paystack/initialize", {
        email: "engine@example.com",
        itemType: "room",
        itemId: "guest-room",
        reservationId: data.id,
        nights: 1,
      }),
    );
    const init = (await initRes.json()) as { amountNgn?: number };
    assert.equal(initRes.status, 200);
    assert.equal(init.amountNgn, data.depositNgn);
  });

  it("an unpaid hold takes the room from other guests until it lapses", async () => {
    const stay = uniqueStay();
    const first = await reserve({ roomId: "presidential-suite", ...stay });
    assert.equal(first.res.status, 200);
    assert.equal(fakeRayza.active().length, 0, "unpaid holds aren't sent to RAYZA");

    const blocked = await reserve({ roomId: "presidential-suite", ...stay });
    assert.equal(blocked.res.status, 409, "RAYZA still shows it free, but the website hold counts");

    const { updateReservationById } = await import("@/lib/demo-store");
    await updateReservationById(first.data.id as string, {
      holdExpiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    const { POST: initPayment } = await import("@/app/api/paystack/initialize/route");
    const initRes = await initPayment(
      json("http://localhost/api/paystack/initialize", {
        email: "engine@example.com",
        itemType: "room",
        itemId: "presidential-suite",
        reservationId: first.data.id,
      }),
    );
    assert.equal(initRes.status, 409);
    assert.equal(((await initRes.json()) as { code?: string }).code, "hold_expired");

    const second = await reserve({ roomId: "presidential-suite", ...stay });
    assert.equal(second.res.status, 200, "room should be bookable once the hold lapsed");
  });

  it("availability lists RAYZA's price and free count, and explains restricted rooms", async () => {
    const { GET } = await import("@/app/api/rooms/availability/route");
    const stay = uniqueStay();
    fakeRayza.frontDesk["guest-room"] = 1;
    const res = await GET(
      new Request(`http://localhost/api/rooms/availability?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=4&rooms=1`),
    );
    const data = (await res.json()) as {
      liveUnavailable: boolean;
      available: { id: string; priceFrom: number; availableUnits: number; totalFrom: number }[];
      restricted: { id: string; code: string }[];
    };
    assert.equal(data.liveUnavailable, false);
    const suite = data.available.find((r) => r.id === "presidential-suite");
    assert.deepEqual([suite?.priceFrom, suite?.totalFrom, suite?.availableUnits], [200_000, 400_000, 1]);
    assert.ok(data.restricted.some((r) => r.id === "guest-room" && r.code === "over_capacity"), "RAYZA sleeps 3");
    assert.ok(!data.available.some((r) => r.id === "presidential-suite" && r.availableUnits > 1));
  });

  it("sells nothing online when RAYZA can't be reached", async () => {
    fakeRayza.down = true;
    const stay = uniqueStay();
    const { GET } = await import("@/app/api/rooms/availability/route");
    const res = await GET(
      new Request(`http://localhost/api/rooms/availability?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=2&rooms=1`),
    );
    const data = (await res.json()) as { liveUnavailable: boolean; available: unknown[] };
    assert.equal(data.liveUnavailable, true);
    assert.equal(data.available.length, 0);

    const { res: booked, data: body } = await reserve({ roomId: "guest-room", ...stay });
    assert.equal(booked.status, 503);
    assert.equal(body.code, "rayza_unavailable");
  });

  it("a room type that isn't linked to RAYZA can't be booked online", async () => {
    const { saveRayzaRoomLinks, clearRayzaCache } = await import("@/lib/integrations/rayza-sync");
    await saveRayzaRoomLinks({ links: { "guest-room": "guest-room" } });
    clearRayzaCache();
    try {
      const { res, data } = await reserve({ roomId: "executive-room", ...uniqueStay() });
      assert.equal(res.status, 422);
      assert.equal(data.code, "unknown_room");
    } finally {
      await installFakeRayza();
    }
  });

  it("manage link: view, pay deposit, cancel once, and reject bad tokens", async () => {
    const { data } = await reserve({ roomId: "signature-suite", ...uniqueStay() });
    const id = data.id as string;
    const { signReservationId } = await import("@/lib/booking-engine/manage-link");
    const t = signReservationId(id);

    const { GET } = await import("@/app/api/booking/manage/route");
    const bad = await GET(new Request(`http://localhost/api/booking/manage?id=${id}&t=${"x".repeat(32)}`));
    assert.equal(bad.status, 404);

    const view = await GET(new Request(`http://localhost/api/booking/manage?id=${id}&t=${t}`));
    const viewData = (await view.json()) as { booking: { amountDueKind: string; amountDueNgn: number; canCancel: boolean } };
    assert.equal(view.status, 200);
    assert.equal(viewData.booking.amountDueKind, "deposit");
    assert.equal(viewData.booking.amountDueNgn, data.depositNgn);
    assert.equal(viewData.booking.canCancel, true);

    const { POST: pay } = await import("@/app/api/booking/manage/pay/route");
    const payRes = await pay(json("http://localhost/api/booking/manage/pay", { id, t }));
    const payData = (await payRes.json()) as { authorizationUrl?: string; amountNgn?: number };
    assert.equal(payRes.status, 200);
    assert.ok(payData.authorizationUrl?.includes("demo=1"));
    assert.equal(payData.amountNgn, data.depositNgn);

    const { POST: cancel } = await import("@/app/api/booking/manage/cancel/route");
    const cancelRes = await cancel(json("http://localhost/api/booking/manage/cancel", { id, t }));
    assert.equal(cancelRes.status, 200);
    const again = await cancel(json("http://localhost/api/booking/manage/cancel", { id, t }));
    assert.equal(again.status, 409);
  });
});
