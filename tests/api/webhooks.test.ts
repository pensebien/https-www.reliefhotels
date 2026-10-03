import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";

const KEY = "relief-demo-2026";
type Sent = { url: string; headers: Record<string, string>; body: string };

describe("Booking webhooks", () => {
  const realFetch = globalThis.fetch;
  const sent: Sent[] = [];
  let failNext = false;

  before(() => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    delete process.env.DEMO_DASHBOARD_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!url.startsWith("https://hooks.example.com")) return realFetch(input, init);
      sent.push({ url, headers: init?.headers as Record<string, string>, body: String(init?.body) });
      if (failNext) {
        failNext = false;
        return new Response("nope", { status: 500 });
      }
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
  });
  after(async () => {
    globalThis.fetch = realFetch;
    const { saveWebhooks } = await import("@/lib/integrations/webhooks");
    await saveWebhooks({ hooks: [] });
  });

  const put = async (hooks: unknown[]) => {
    const { PUT } = await import("@/app/api/staff/settings/webhooks/route");
    return PUT(new Request(`http://localhost/x?key=${KEY}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hooks }) }));
  };

  it("refuses unsafe addresses", async () => {
    for (const url of ["http://hooks.example.com/x", "https://127.0.0.1/x", "https://localhost/x", "https://10.0.0.5/x"]) {
      const res = await put([{ id: "bad", name: "Bad", url, events: ["booking.created"], active: true }]);
      assert.equal(res.status, 400, url);
    }
  });

  it("signs, delivers booking events, logs and resends failures", async () => {
    const res = await put([
      { id: "crm", name: "CRM", url: "https://hooks.example.com/crm", events: ["booking.created", "booking.cancelled"], active: true },
      { id: "off", name: "Off", url: "https://hooks.example.com/off", events: ["booking.created"], active: false },
    ]);
    assert.equal(res.status, 200);
    const { hooks } = (await res.json()) as { hooks: { id: string; secret: string }[] };
    const secret = hooks.find((h) => h.id === "crm")!.secret;
    assert.match(secret, /^whsec_/);

    const { POST } = await import("@/app/api/reservations/route");
    const created = await POST(new Request("http://localhost/api/reservations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Hook", lastName: "Test", email: `hook-${Date.now()}@example.com`, phone: "+2348011111111", stayPreference: "t",
        message: "t", itemType: "room", roomId: "guest-room", guests: 2, nights: 2, checkIn: "2027-03-01", checkOut: "2027-03-03",
      }),
    }));
    assert.equal(created.status, 200);
    const delivered = sent.filter((s) => s.headers["X-Relief-Event"] === "booking.created");
    assert.deepEqual(delivered.map((s) => s.url), ["https://hooks.example.com/crm"]);
    const payload = JSON.parse(delivered[0].body) as { event: string; booking: { roomId?: string; room: { id: string }; guest: { firstName: string } } };
    assert.equal(payload.booking.room.id, "guest-room");
    assert.equal(payload.booking.guest.firstName, "Hook");
    assert.equal(delivered[0].headers["X-Relief-Signature"], `sha256=${createHmac("sha256", secret).update(delivered[0].body).digest("hex")}`);

    // A failed test send is logged and can be resent.
    failNext = true;
    const { POST: test } = await import("@/app/api/staff/settings/webhooks/test/route");
    const t = (await (await test(new Request(`http://localhost/x?key=${KEY}`, { method: "POST", body: JSON.stringify({ id: "crm" }) }))).json()) as { delivery: { status: string; httpStatus: number } };
    assert.deepEqual([t.delivery.status, t.delivery.httpStatus], ["failed", 500]);

    const { GET } = await import("@/app/api/staff/settings/webhooks/route");
    const list = (await (await GET(new Request(`http://localhost/x?key=${KEY}`))).json()) as { deliveries: { id: string; status: string; body?: string }[] };
    const failed = list.deliveries.find((d) => d.status === "failed")!;
    assert.equal(failed.body, undefined);

    const { POST: resend } = await import("@/app/api/staff/settings/webhooks/resend/route");
    const again = (await (await resend(new Request(`http://localhost/x?key=${KEY}`, { method: "POST", body: JSON.stringify({ id: failed.id }) }))).json()) as { status: string };
    assert.equal(again.status, "sent");
    assert.equal(sent.at(-1)!.headers["X-Relief-Delivery"], failed.id);
  });

  it("never throws when an endpoint is down", async () => {
    const { emitBookingEvent } = await import("@/lib/integrations/webhooks");
    failNext = true;
    await emitBookingEvent("booking.cancelled", { id: "x", firstName: "A", lastName: "B", email: "a@b.co" } as never);
  });
});
