import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";

const RATE_CONFIG_FILE = path.join(process.cwd(), "data", "rate-config.json");
const KEY = "relief-demo-2026";
/** Redemptions persist in data/demo-store.json, so each run needs its own code. */
const ONCE_CODE = `ONCE${Date.now()}`;

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.NOTIFY_CHANNEL = "console";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
  process.env.STAFF_AUTH_ENABLED = "false";
  delete process.env.DEMO_DASHBOARD_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
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

describe("Booking engine API", () => {
  before(async () => {
    setTestEnv();
    const { saveRateConfig, DEFAULT_RATE_CONFIG } = await import("@/lib/booking-engine/rate-config");
    await saveRateConfig({
      ...DEFAULT_RATE_CONFIG,
      longStay: [{ minNights: 3, pct: 10 }],
      coupons: [
        { code: "ENGINE20", pct: 20, active: true },
        { code: ONCE_CODE, pct: 5, maxRedemptions: 1, active: true },
      ],
      extras: [
        { id: "breakfast", label: "Breakfast", priceNgn: 10_000, pricing: "per_guest_night", active: true },
      ],
    });
  });

  after(async () => {
    await fs.rm(RATE_CONFIG_FILE, { force: true });
    const { clearRateConfigCache } = await import("@/lib/booking-engine/rate-config");
    clearRateConfigCache();
  });

  it("only one of two simultaneous bookings gets the last room", async () => {
    const stay = uniqueStay();
    const [a, b] = await Promise.all([
      reserve({ roomId: "presidential-suite", ...stay }),
      reserve({ roomId: "presidential-suite", ...stay }),
    ]);
    assert.deepEqual([a.res.status, b.res.status].sort(), [200, 409]);
  });

  it("rejects parties over the room's capacity with a clear code", async () => {
    const { res, data } = await reserve({ roomId: "guest-room", guests: 3, ...uniqueStay() });
    assert.equal(res.status, 422);
    assert.equal(data.code, "over_capacity");
  });

  it("books two rooms, with coupon and extras, and charges the server-quoted deposit", async () => {
    const stay = uniqueStay(3);
    const { res, data } = await reserve({
      roomId: "guest-room",
      guests: 3,
      rooms: 2,
      couponCode: "engine20",
      extraIds: ["breakfast"],
      ...stay,
    });
    assert.equal(res.status, 200, JSON.stringify(data));
    // 95k × 3 nights × 2 rooms = 570k; −10% long stay = 513k; −20% = 410.4k; + 3 guests × 3 nights × 10k.
    assert.equal(data.totalNgn, 570_000 - 57_000 - 102_600 + 90_000);
    assert.equal(data.depositNgn, Math.round((data.totalNgn as number) * 0.2));

    const { findReservationById } = await import("@/lib/demo-store");
    const record = await findReservationById(data.id as string);
    assert.equal(record?.nights, 3);
    assert.equal(record?.units, 2);
    assert.equal(record?.couponCode, "ENGINE20");

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

  it("enforces a coupon's max uses", async () => {
    const first = await reserve({ roomId: "executive-room", couponCode: ONCE_CODE, ...uniqueStay() });
    assert.equal(first.res.status, 200);
    const second = await reserve({ roomId: "executive-room", couponCode: ONCE_CODE, ...uniqueStay() });
    assert.equal(second.res.status, 422);
    assert.equal(second.data.code, "invalid_coupon");
  });

  it("releases an expired hold and refuses to take payment for it", async () => {
    const stay = uniqueStay();
    const first = await reserve({ roomId: "presidential-suite", ...stay });
    assert.equal(first.res.status, 200);

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

  it("availability explains restricted rooms instead of silently hiding them", async () => {
    const { GET } = await import("@/app/api/rooms/availability/route");
    const stay = uniqueStay();
    const res = await GET(
      new Request(`http://localhost/api/rooms/availability?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=4&rooms=1`),
    );
    const data = (await res.json()) as { available: { id: string }[]; restricted: { id: string; code: string }[] };
    assert.ok(data.available.some((r) => r.id === "presidential-suite"));
    assert.ok(data.restricted.some((r) => r.id === "guest-room" && r.code === "over_capacity"));
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

  it("staff rates endpoint validates and saves the config", async () => {
    const { GET, PUT } = await import("@/app/api/staff/settings/rates/route");
    const unauthorized = await GET(new Request("http://localhost/api/staff/settings/rates"));
    assert.equal(unauthorized.status, 401);

    const current = (await (await GET(new Request(`http://localhost/api/staff/settings/rates?key=${KEY}`))).json()) as {
      config: Record<string, unknown>;
    };
    const invalid = await PUT(
      json(`http://localhost/api/staff/settings/rates?key=${KEY}`, { ...current.config, depositPct: 150 }, "PUT"),
    );
    assert.equal(invalid.status, 400);

    const saved = await PUT(
      json(`http://localhost/api/staff/settings/rates?key=${KEY}`, { ...current.config, holdMinutes: 45 }, "PUT"),
    );
    assert.equal(saved.status, 200);
    assert.equal(((await saved.json()) as { config: { holdMinutes: number } }).config.holdMinutes, 45);
  });

  it("walk-ins: no overbooking, stay rules enforced, staff can override rules", async () => {
    const { POST } = await import("@/app/api/demo/reservations/route");
    const walkIn = (overrides: Record<string, unknown>) =>
      POST(
        json(`http://localhost/api/demo/reservations?key=${KEY}`, {
          firstName: "Walk",
          lastName: "In",
          email: `walkin-${Date.now()}@example.com`,
          roomId: "presidential-suite",
          guests: 2,
          status: "confirmed",
          paymentMethod: "cash",
          ...overrides,
        }),
      );

    const stay = uniqueStay();
    const online = await reserve({ roomId: "presidential-suite", ...stay });
    assert.equal(online.res.status, 200);

    const clash = await walkIn(stay);
    assert.equal(clash.status, 409, "desk must not double-book the last room");
    assert.equal(((await clash.json()) as { overridable?: boolean }).overridable, false);

    const crowded = await walkIn({ ...uniqueStay(), roomId: "guest-room", guests: 3 });
    const crowdedBody = (await crowded.json()) as { code?: string; overridable?: boolean };
    assert.equal(crowded.status, 422);
    assert.equal(crowdedBody.code, "over_capacity");
    assert.equal(crowdedBody.overridable, true);

    const overridden = await walkIn({ ...uniqueStay(), roomId: "guest-room", guests: 3, overrideRules: true });
    const body = (await overridden.json()) as {
      depositNgn?: number;
      reservation?: { holdExpiresAt?: string; quotedDepositNgn?: number; status?: string; message?: string };
    };
    assert.equal(overridden.status, 200);
    assert.equal(body.reservation?.status, "confirmed");
    assert.equal(body.reservation?.holdExpiresAt, undefined, "desk bookings don't expire");
    assert.equal(body.depositNgn, body.reservation?.quotedDepositNgn);
    assert.match(body.reservation?.message ?? "", /Stay rules overridden by staff/);
  });
});
