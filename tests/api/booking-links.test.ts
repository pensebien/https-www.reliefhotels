import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const KEY = "relief-demo-2026";

describe("Booking links", () => {
  before(() => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    delete process.env.DEMO_DASHBOARD_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
  after(async () => {
    const { saveBookingLinks } = await import("@/lib/booking-engine/booking-links");
    await saveBookingLinks({ links: [] });
  });

  const put = async (links: unknown[]) => {
    const { PUT } = await import("@/app/api/staff/settings/booking-links/route");
    return PUT(new Request(`http://localhost/x?key=${KEY}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ links }) }));
  };

  it("validates names and refuses duplicates", async () => {
    assert.equal((await put([{ slug: "Bad Name!", label: "x" }])).status, 400);
    assert.equal((await put([{ slug: "acme", label: "A" }, { slug: "acme", label: "B" }])).status, 400);
  });

  it("saves links, resolves active ones publicly and hides inactive ones", async () => {
    const res = await put([
      { slug: "acme-corporate", label: "Acme corporate rate", roomIds: ["guest-room"], couponCode: "acme10", active: true },
      { slug: "old-promo", label: "Old", active: false },
    ]);
    assert.equal(res.status, 200);
    const { links } = (await res.json()) as { links: { slug: string; couponCode?: string; roomIds: string[] }[] };
    assert.equal(links[0].couponCode, "ACME10");
    assert.deepEqual(links[1].roomIds, []);

    const { GET } = await import("@/app/api/booking-links/[slug]/route");
    const ok = await GET(new Request("http://localhost/x"), { params: Promise.resolve({ slug: "acme-corporate" }) });
    const body = (await ok.json()) as { link: { label: string; roomIds: string[]; couponCode: string } };
    assert.deepEqual([body.link.label, body.link.roomIds, body.link.couponCode], ["Acme corporate rate", ["guest-room"], "ACME10"]);
    const off = await GET(new Request("http://localhost/x"), { params: Promise.resolve({ slug: "old-promo" }) });
    assert.equal(off.status, 404);

    const { linkCoversRoom } = await import("@/lib/booking-engine/booking-links");
    assert.equal(linkCoversRoom({ roomIds: ["guest-room"] }, "executive-room"), false);
    assert.equal(linkCoversRoom({ roomIds: [] }, "executive-room"), true);
  });

  it("is manager-only to edit", async () => {
    const { GET } = await import("@/app/api/staff/settings/booking-links/route");
    const res = await GET(new Request("http://localhost/x?key=wrong"));
    assert.equal(res.status, 401);
  });
});
