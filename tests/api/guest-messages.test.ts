import { dataPath } from "@/lib/data-dir";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { after, before, describe, it } from "node:test";

const KEY = "relief-demo-2026";
const SETTINGS = dataPath("settings", "guest_messages.json");

describe("Guest messages API", () => {
  before(() => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    delete process.env.DEMO_DASHBOARD_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.CRON_SECRET;
  });
  after(async () => {
    await fs.rm(SETTINGS, { force: true });
    const { clearSettingsCache } = await import("@/lib/settings-store");
    clearSettingsCache();
  });

  it("protects the daily job with CRON_SECRET", async () => {
    const { POST } = await import("@/app/api/cron/daily/route");
    assert.equal((await POST(new Request("http://localhost/api/cron/daily", { method: "POST" }))).status, 503);
    process.env.CRON_SECRET = "cron-test-secret";
    assert.equal((await POST(new Request("http://localhost/api/cron/daily", { method: "POST", headers: { Authorization: "Bearer nope" } }))).status, 401);
  });

  it("sends a switched-on template once per booking", async () => {
    process.env.CRON_SECRET = "cron-test-secret";
    // A confirmed booking checking in two days from today (Calabar time).
    const { lagosToday } = await import("@/lib/guest-messages/render");
    const inTwo = new Date(`${lagosToday()}T00:00:00Z`);
    inTwo.setUTCDate(inTwo.getUTCDate() + 2);
    const out = new Date(inTwo);
    out.setUTCDate(out.getUTCDate() + 1);
    const { addReservation } = await import("@/lib/demo-store");
    const booking = await addReservation({
      firstName: "Msg", lastName: "Test", email: `msg-${Date.now()}@example.com`, itemType: "room", roomId: "guest-room",
      checkIn: inTwo.toISOString().slice(0, 10), checkOut: out.toISOString().slice(0, 10), nights: 1, guests: 1,
      stayPreference: "t", message: "t", emailSent: false, status: "confirmed",
    });

    const { GET, PUT } = await import("@/app/api/staff/settings/messages/route");
    const current = (await (await GET(new Request(`http://localhost/api/staff/settings/messages?key=${KEY}`))).json()) as {
      settings: { templates: { id: string; active: boolean }[] };
      scheduled: boolean;
    };
    assert.equal(current.scheduled, true);
    const templates = current.settings.templates.map((t) => ({ ...t, active: t.id === "pre-arrival" }));
    const badBooking = await PUT(new Request(`http://localhost/api/staff/settings/messages?key=${KEY}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates: [{ ...templates[0], base: "booking", timing: "before" }] }),
    }));
    assert.equal(badBooking.status, 400);
    const saved = await PUT(new Request(`http://localhost/api/staff/settings/messages?key=${KEY}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templates }),
    }));
    assert.equal(saved.status, 200);

    const { POST } = await import("@/app/api/cron/daily/route");
    const run = () => POST(new Request("http://localhost/api/cron/daily", { method: "POST", headers: { Authorization: "Bearer cron-test-secret" } }));
    const first = (await (await run()).json()) as { guestMessages: { notConfigured: number; alreadySent: number } };
    assert.ok(first.guestMessages.notConfigured >= 1, "email isn't configured in tests, so it's logged as not set up");
    const second = (await (await run()).json()) as { guestMessages: { notConfigured: number; alreadySent: number } };
    assert.ok(second.guestMessages.alreadySent >= 1, "the same booking is never messaged twice");

    const { recentMessages } = await import("@/lib/guest-messages/log");
    const entries = (await recentMessages(200)).filter((e) => e.reservationId === booking.id);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].status, "not_configured");
  });

  it("test send needs an email address for email templates", async () => {
    const { POST } = await import("@/app/api/staff/settings/messages/test/route");
    const { DEFAULT_GUEST_MESSAGES } = await import("@/lib/guest-messages/settings");
    const send = (to: string) => POST(new Request(`http://localhost/api/staff/settings/messages/test?key=${KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: DEFAULT_GUEST_MESSAGES.templates[0], to }),
    }));
    assert.equal((await send("+2348000000")).status, 400);
    const ok = (await (await send("manager@example.com")).json()) as { status: string };
    assert.equal(ok.status, "not_configured");
  });
});
