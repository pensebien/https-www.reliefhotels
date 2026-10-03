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

let seq = 0;
function stay() {
  const base = new Date(Date.UTC(2037, 0, 1 + (Math.floor(Date.now() / 1000) % 3000) + seq++ * 3));
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  return { checkIn: base.toISOString().slice(0, 10), checkOut: out.toISOString().slice(0, 10) };
}

const json = (url: string, body: unknown) =>
  new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("Refunds API", () => {
  before(setTestEnv);

  it("refunds an online deposit through Paystack, never more than was paid, and invoices net it", async () => {
    const { POST: reserve } = await import("@/app/api/reservations/route");
    const created = (await (await reserve(json("http://localhost/api/reservations", {
      firstName: "Re", lastName: "Fund", email: `rf-${Date.now()}@example.com`, phone: "+2348000000000",
      stayPreference: "t", message: "t", itemType: "room", roomId: "executive-room", guests: 2, nights: 2, ...stay(),
    }))).json()) as { id: string; depositNgn: number };

    const { POST: init } = await import("@/app/api/paystack/initialize/route");
    const { reference } = (await (await init(json("http://localhost/api/paystack/initialize", {
      email: "rf@example.com", itemType: "room", itemId: "executive-room", reservationId: created.id,
    }))).json()) as { reference: string };
    const { GET: verify } = await import("@/app/api/paystack/verify/route");
    await verify(new Request(`http://localhost/api/paystack/verify?reference=${reference}&demo=1`));

    const { GET, POST } = await import("@/app/api/staff/reservations/[id]/refunds/route");
    const url = `http://localhost/api/staff/reservations/${created.id}/refunds?key=${KEY}`;
    const before = (await (await GET(new Request(url), ctx(created.id))).json()) as {
      payments: { reference: string; refundableNgn: number; viaPaystack: boolean }[];
    };
    assert.equal(before.payments[0].refundableNgn, created.depositNgn);
    assert.equal(before.payments[0].viaPaystack, true);

    const part = await POST(json(url, { paymentReference: reference, amountNgn: 10_000, reason: "Late cancellation goodwill" }), ctx(created.id));
    assert.equal(part.status, 200);
    assert.equal(((await part.json()) as { status: string }).status, "success", "demo mode settles instantly");

    const tooMuch = await POST(json(url, { paymentReference: reference, amountNgn: created.depositNgn, reason: "Again" }), ctx(created.id));
    assert.equal(tooMuch.status, 409);

    const after = (await (await GET(new Request(url), ctx(created.id))).json()) as {
      payments: { refundableNgn: number }[];
      refunds: { amountNgn: number; refundOf: string }[];
    };
    assert.equal(after.payments[0].refundableNgn, created.depositNgn - 10_000);
    assert.deepEqual(after.refunds.map((r) => [r.amountNgn, r.refundOf]), [[10_000, reference]]);

    const { POST: issue } = await import("@/app/api/staff/reservations/[id]/invoices/route");
    const inv = (await (await issue(new Request(`http://localhost/api/staff/reservations/${created.id}/invoices?key=${KEY}`, { method: "POST" }), ctx(created.id))).json()) as {
      invoice: { document: { totals: { paidNgn: number } } };
    };
    assert.equal(inv.invoice.document.totals.paidNgn, created.depositNgn - 10_000);
  });

  it("records hand-back refunds for cash walk-ins and settles pending Paystack refunds from the webhook", async () => {
    const { POST: walkIn } = await import("@/app/api/demo/reservations/route");
    const res = (await (await walkIn(json(`http://localhost/api/demo/reservations?key=${KEY}`, {
      firstName: "Cash", lastName: "Guest", email: `cash-${Date.now()}@example.com`, roomId: "guest-room",
      guests: 1, status: "confirmed", paymentMethod: "cash", ...stay(),
    }))).json()) as { id: string; paymentReference: string; depositNgn: number };

    const { POST } = await import("@/app/api/staff/reservations/[id]/refunds/route");
    const refund = (await (await POST(json(`http://localhost/api/staff/reservations/${res.id}/refunds?key=${KEY}`, {
      paymentReference: res.paymentReference, amountNgn: res.depositNgn, reason: "Guest left early",
    }), ctx(res.id))).json()) as { viaPaystack: boolean; status: string; reference: string };
    assert.equal(refund.viaPaystack, false);
    assert.equal(refund.status, "success");

    // A pending Paystack refund row, as the live API would leave it…
    const { addPayment, findPaymentByReference } = await import("@/lib/demo-store");
    const pendingRef = `RF-TEST-${Date.now()}`;
    await addPayment({
      reference: pendingRef, reservationId: res.id, email: "x@example.com", amountKobo: -500_000, currency: "NGN",
      status: "pending", itemType: "room", itemId: "guest-room", itemLabel: "Refund — test", paymentMethod: "paystack",
      paymentChannel: "paystack", externalReference: "RH-ORIGINAL-1",
    });
    // …settled by refund.processed for that transaction and amount.
    const { settlePaystackRefund } = await import("@/lib/refunds");
    assert.equal(await settlePaystackRefund({ transactionReference: "RH-ORIGINAL-1", amountKobo: 500_000, processed: true }), true);
    assert.equal((await findPaymentByReference(pendingRef))?.status, "success");
    assert.equal(await settlePaystackRefund({ transactionReference: "RH-UNKNOWN", amountKobo: 1, processed: true }), false);
  });
});
