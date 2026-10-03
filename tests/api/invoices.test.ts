import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";

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

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (url: string, body: unknown, method = "POST") =>
  new Request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("Invoices API", () => {
  before(setTestEnv);
  after(async () => {
    await fs.rm(path.join(process.cwd(), "data", "settings", "invoice_settings.json"), { force: true });
  });

  it("issues numbered invoices, credits each once, and serves a signed guest link", async () => {
    const { POST: reserve } = await import("@/app/api/reservations/route");
    const base = new Date(Date.UTC(2035, 0, 1 + (Math.floor(Date.now() / 1000) % 3000)));
    const out = new Date(base);
    out.setUTCDate(out.getUTCDate() + 2);
    const created = (await (await reserve(json("http://localhost/api/reservations", {
      firstName: "Inv", lastName: "Oice", email: `inv-${Date.now()}@example.com`, phone: "+2348000000000",
      stayPreference: "t", message: "t", itemType: "room", roomId: "executive-room", guests: 2, nights: 2,
      checkIn: base.toISOString().slice(0, 10), checkOut: out.toISOString().slice(0, 10),
    }))).json()) as { id: string; totalNgn: number };

    const { POST: issue, GET: list } = await import("@/app/api/staff/reservations/[id]/invoices/route");
    const url = `http://localhost/api/staff/reservations/${created.id}/invoices?key=${KEY}`;
    const first = (await (await issue(new Request(url, { method: "POST" }), ctx(created.id))).json()) as {
      invoice: { id: string; number: string; totalNgn: number; document: { totals: { balanceNgn: number } } };
    };
    const second = (await (await issue(new Request(url, { method: "POST" }), ctx(created.id))).json()) as {
      invoice: { id: string; number: string };
    };
    const year = new Date().getFullYear();
    assert.match(first.invoice.number, new RegExp(`^RH-${year}-\\d{5}$`));
    assert.equal(Number(second.invoice.number.slice(-5)), Number(first.invoice.number.slice(-5)) + 1, "sequential");
    assert.equal(first.invoice.totalNgn, created.totalNgn);
    assert.equal(first.invoice.document.totals.balanceNgn, created.totalNgn, "nothing paid yet");

    const listed = (await (await list(new Request(url), ctx(created.id))).json()) as { invoices: unknown[] };
    assert.equal(listed.invoices.length, 2);

    const { POST: credit } = await import("@/app/api/staff/invoices/[id]/credit-note/route");
    const creditUrl = (id: string) => `http://localhost/api/staff/invoices/${id}/credit-note?key=${KEY}`;
    assert.equal((await credit(json(creditUrl(first.invoice.id), { reason: "" }), ctx(first.invoice.id))).status, 400);
    const cn = await credit(json(creditUrl(first.invoice.id), { reason: "Issued twice" }), ctx(first.invoice.id));
    const cnBody = (await cn.json()) as { invoice: { id: string; number: string; totalNgn: number } };
    assert.equal(cn.status, 200);
    assert.match(cnBody.invoice.number, new RegExp(`^CN-${year}-\\d{5}$`));
    assert.equal(cnBody.invoice.totalNgn, -created.totalNgn);
    assert.equal((await credit(json(creditUrl(first.invoice.id), { reason: "Again" }), ctx(first.invoice.id))).status, 409);
    assert.equal((await credit(json(creditUrl(cnBody.invoice.id), { reason: "Credit a credit" }), ctx(cnBody.invoice.id))).status, 422);

    const { signInvoiceId } = await import("@/lib/booking-engine/manage-link");
    const { GET: guest } = await import("@/app/api/booking/invoice/route");
    const ok = await guest(new Request(`http://localhost/api/booking/invoice?id=${first.invoice.id}&t=${signInvoiceId(first.invoice.id)}`));
    assert.equal(ok.status, 200);
    const bad = await guest(new Request(`http://localhost/api/booking/invoice?id=${first.invoice.id}&t=${signInvoiceId(second.invoice.id)}`));
    assert.equal(bad.status, 404, "another invoice's token must not open this one");
  });

  it("validates invoice settings", async () => {
    const { GET, PUT } = await import("@/app/api/staff/settings/invoices/route");
    const current = (await (await GET(new Request(`http://localhost/api/staff/settings/invoices?key=${KEY}`))).json()) as { settings: Record<string, unknown> };
    const bad = await PUT(json(`http://localhost/api/staff/settings/invoices?key=${KEY}`, { ...current.settings, invoiceFormat: "RH-{year}" }, "PUT"));
    assert.equal(bad.status, 400);
    const good = await PUT(json(`http://localhost/api/staff/settings/invoices?key=${KEY}`, { ...current.settings, paymentTermsDays: 7, payeeTaxId: "12345678-0001" }, "PUT"));
    assert.equal(good.status, 200);
  });
});
