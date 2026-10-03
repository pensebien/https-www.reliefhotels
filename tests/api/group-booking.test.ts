import { dataPath } from "@/lib/data-dir";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { after, before, describe, it } from "node:test";

const KEY = "relief-demo-2026";
const RATE_FILE = dataPath("rate-config.json");
const ONCE = `GRP${Date.now()}`;

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.NOTIFY_CHANNEL = "console";
  process.env.STAFF_AUTH_ENABLED = "false";
  delete process.env.DEMO_DASHBOARD_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

let seq = 0;
function stay() {
  const base = new Date(Date.UTC(2038, 0, 1 + (Math.floor(Date.now() / 1000) % 3000) * 2 + seq++ * 4));
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  return { checkIn: base.toISOString().slice(0, 10), checkOut: out.toISOString().slice(0, 10) };
}

const json = (url: string, body: unknown) =>
  new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function book(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/reservations/route");
  const res = await POST(json("http://localhost/api/reservations", {
    firstName: "Group", lastName: "Lead", email: `grp-${Date.now()}@example.com`, phone: "+2348000000000",
    stayPreference: "t", message: "t", itemType: "room", nights: 2, ...body,
  }));
  return { res, data: (await res.json()) as Record<string, unknown> };
}

describe("Group booking API", () => {
  before(async () => {
    setTestEnv();
    const { saveRateConfig, DEFAULT_RATE_CONFIG } = await import("@/lib/booking-engine/rate-config");
    await saveRateConfig({ ...DEFAULT_RATE_CONFIG, coupons: [{ code: ONCE, pct: 5, maxRedemptions: 1, active: true }] });
  });
  after(async () => {
    await fs.rm(RATE_FILE, { force: true });
    const { clearRateConfigCache } = await import("@/lib/booking-engine/rate-config");
    clearRateConfigCache();
  });

  it("books several room types as one group, one deposit, one confirmation, one invoice", async () => {
    const dates = stay();
    const { res, data } = await book({
      roomId: "guest-room", guests: 5, couponCode: ONCE, ...dates,
      stays: [{ roomId: "guest-room", rooms: 2 }, { roomId: "signature-suite", rooms: 1 }],
    });
    assert.equal(res.status, 200, JSON.stringify(data));
    const leadId = data.id as string;

    const { findReservationById, listGroupMembers } = await import("@/lib/demo-store");
    const lead = (await findReservationById(leadId))!;
    assert.equal(lead.groupId, leadId, "the lead's id is the group id");
    const members = await listGroupMembers(lead);
    assert.deepEqual(members.map((m) => [m.roomId, m.units]), [["guest-room", 2], ["signature-suite", 1]]);
    assert.equal(members.reduce((s, m) => s + (m.quotedTotalNgn ?? 0), 0), data.totalNgn);

    // The coupon counts once for the whole group: a new single booking can't use it.
    const second = await book({ roomId: "executive-room", guests: 2, couponCode: ONCE, ...stay() });
    assert.equal(second.res.status, 422);

    const { POST: init } = await import("@/app/api/paystack/initialize/route");
    const initBody = (await (await init(json("http://localhost/api/paystack/initialize", {
      email: "grp@example.com", itemType: "room", itemId: "guest-room", reservationId: leadId,
    }))).json()) as { reference: string; amountNgn: number };
    assert.equal(initBody.amountNgn, data.depositNgn, "deposit covers every room type");

    const { GET: verify } = await import("@/app/api/paystack/verify/route");
    await verify(new Request(`http://localhost/api/paystack/verify?reference=${initBody.reference}&demo=1`));
    for (const m of await listGroupMembers(lead)) assert.equal((await findReservationById(m.id))?.status, "confirmed");

    const { signReservationId } = await import("@/lib/booking-engine/manage-link");
    const { GET: manage } = await import("@/app/api/booking/manage/route");
    const view = (await (await manage(new Request(`http://localhost/api/booking/manage?id=${leadId}&t=${signReservationId(leadId)}`))).json()) as {
      booking: { totalNgn: number; paidNgn: number; rooms: number; lines: unknown[] };
    };
    assert.equal(view.booking.totalNgn, data.totalNgn);
    assert.equal(view.booking.paidNgn, data.depositNgn);
    assert.equal(view.booking.rooms, 3);
    assert.equal(view.booking.lines.length, 2);

    const { POST: issue } = await import("@/app/api/staff/reservations/[id]/invoices/route");
    const inv = (await (await issue(new Request(`http://localhost/api/staff/reservations/${members[1].id}/invoices?key=${KEY}`, { method: "POST" }), ctx(members[1].id))).json()) as {
      invoice: { reservationId: string; totalNgn: number; document: { lines: { description: string }[] } };
    };
    assert.equal(inv.invoice.reservationId, leadId, "invoice goes on the lead line");
    assert.equal(inv.invoice.totalNgn, data.totalNgn);
    assert.ok(inv.invoice.document.lines.some((l) => l.description.startsWith("Standard")));
    assert.ok(inv.invoice.document.lines.some((l) => l.description.startsWith("Suite")));

    const { POST: cancel } = await import("@/app/api/booking/manage/cancel/route");
    assert.equal((await cancel(json("http://localhost/api/booking/manage/cancel", { id: leadId, t: signReservationId(leadId) }))).status, 200);
    for (const m of members) assert.equal((await findReservationById(m.id))?.status, "cancelled");
  });

  it("releases rooms already taken when a later room type sold out", async () => {
    const dates = stay();
    const taken = await book({ roomId: "presidential-suite", guests: 2, ...dates });
    assert.equal(taken.res.status, 200);

    const { res, data } = await book({
      roomId: "executive-room", guests: 3, ...dates,
      stays: [{ roomId: "executive-room", rooms: 1 }, { roomId: "presidential-suite", rooms: 1 }],
    });
    assert.equal(res.status, 409);
    assert.match(String(data.error), /Penthouse Suite is no longer available/);

    const { listOverlappingRoomReservations } = await import("@/lib/demo-store");
    const held = await listOverlappingRoomReservations("executive-room", dates.checkIn, dates.checkOut);
    assert.equal(held.filter((r) => r.lastName === "Lead").length, 0, "executive line was released");
  });
});
