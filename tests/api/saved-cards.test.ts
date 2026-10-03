import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

const KEY = "relief-demo-2026";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (url: string, body: unknown) =>
  new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

let seq = 0;
function stay() {
  const base = new Date(Date.UTC(2040, 0, 1 + (Math.floor(Date.now() / 1000) % 3000) + seq++ * 3));
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  return { checkIn: base.toISOString().slice(0, 10), checkOut: out.toISOString().slice(0, 10) };
}

async function bookAndPay(saveCard: boolean) {
  const { POST } = await import("@/app/api/reservations/route");
  const created = (await (await POST(json("http://localhost/api/reservations", {
    firstName: "Card", lastName: "Holder", email: `card-${Date.now()}-${seq}@example.com`, phone: "+2348000000000",
    stayPreference: "t", message: "t", itemType: "room", roomId: "executive-room", guests: 2, nights: 2, saveCard, ...stay(),
  }))).json()) as { id: string; totalNgn: number; depositNgn: number };
  const { POST: init } = await import("@/app/api/paystack/initialize/route");
  const { reference } = (await (await init(json("http://localhost/api/paystack/initialize", {
    email: "card@example.com", itemType: "room", itemId: "executive-room", reservationId: created.id,
  }))).json()) as { reference: string };
  const { GET: verify } = await import("@/app/api/paystack/verify/route");
  await verify(new Request(`http://localhost/api/paystack/verify?reference=${reference}&demo=1`));
  return created;
}

describe("Saved cards API", () => {
  before(() => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    delete process.env.DEMO_DASHBOARD_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("keeps the card only with consent, never exposes the token, and charges up to the balance", async () => {
    const without = await bookAndPay(false);
    const { GET, POST } = await import("@/app/api/staff/reservations/[id]/card/route");
    const none = (await (await GET(new Request(`http://localhost/x?key=${KEY}`), ctx(without.id))).json()) as { card: unknown };
    assert.equal(none.card, null);

    const booking = await bookAndPay(true);
    const res = await GET(new Request(`http://localhost/x?key=${KEY}`), ctx(booking.id));
    const raw = await res.text();
    assert.ok(!raw.includes("AUTH_demo"), "token never leaves the server");
    const info = JSON.parse(raw) as { card: { last4: string }; balanceNgn: number };
    assert.equal(info.card.last4, "4081");
    assert.equal(info.balanceNgn, booking.totalNgn - booking.depositNgn);

    const url = `http://localhost/x?key=${KEY}`;
    assert.equal((await POST(json(url, { amountNgn: info.balanceNgn + 1, reason: "Too much" }), ctx(booking.id))).status, 409);
    const charged = await POST(json(url, { amountNgn: info.balanceNgn, reason: "Balance at check-out" }), ctx(booking.id));
    assert.equal(charged.status, 200);
    const after = (await (await GET(new Request(url), ctx(booking.id))).json()) as { balanceNgn: number };
    assert.equal(after.balanceNgn, 0);
  });

  it("lets the guest remove the card and purges cards after the stay", async () => {
    const booking = await bookAndPay(true);
    const { signReservationId } = await import("@/lib/booking-engine/manage-link");
    const t = signReservationId(booking.id);
    const { GET: manage } = await import("@/app/api/booking/manage/route");
    const view = (await (await manage(new Request(`http://localhost/api/booking/manage?id=${booking.id}&t=${t}`))).json()) as { savedCard: { last4: string } | null };
    assert.equal(view.savedCard?.last4, "4081");

    const { POST: remove } = await import("@/app/api/booking/manage/card/route");
    assert.equal((await remove(json("http://localhost/api/booking/manage/card", { id: booking.id, t }))).status, 200);
    const { findSavedCard, purgeExpiredCards, saveCardIfConsented } = await import("@/lib/saved-cards");
    assert.equal(await findSavedCard(booking.id), undefined);

    // A consented card on a stay that ended long ago is purged.
    const { addReservation } = await import("@/lib/demo-store");
    const old = await addReservation({
      firstName: "Old", lastName: "Stay", email: "old@example.com", itemType: "room", roomId: "guest-room",
      checkIn: "2020-01-01", checkOut: "2020-01-03", nights: 2, guests: 1, stayPreference: "t", message: "t",
      emailSent: false, status: "confirmed", cardConsent: true,
    });
    assert.equal(await saveCardIfConsented(old, old.email, { authorization_code: "AUTH_old", last4: "1111", reusable: true, channel: "card" }), true);
    assert.ok((await purgeExpiredCards(30)) >= 1);
    assert.equal(await findSavedCard(old.id), undefined);
  });
});
