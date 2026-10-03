import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

const KEY = "relief-demo-2026";

describe("Guests API", () => {
  before(() => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    delete process.env.DEMO_DASHBOARD_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("lists and searches guests, saves a profile, and blocks online booking", async () => {
    const email = `guest-${Date.now()}@example.com`;
    const { addReservation } = await import("@/lib/demo-store");
    await addReservation({
      firstName: "Nkem", lastName: "Profile", email, phone: "+2348011111111", itemType: "room", roomId: "guest-room",
      checkIn: "2026-12-01", checkOut: "2026-12-03", nights: 2, guests: 2, stayPreference: "t", message: "t",
      emailSent: false, status: "confirmed", quotedTotalNgn: 190_000,
    });

    const { GET } = await import("@/app/api/staff/guests/route");
    const found = (await (await GET(new Request(`http://localhost/x?key=${KEY}&q=nkem`))).json()) as { guests: { email: string; stays: number }[] };
    assert.ok(found.guests.some((g) => g.email === email && g.stays === 1));

    const { PUT } = await import("@/app/api/staff/guests/profile/route");
    const saved = await PUT(new Request(`http://localhost/x?key=${KEY}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, tags: ["VIP"], company: "Calabar Ports", notes: "Prefers high floor", blocked: true }),
    }));
    assert.equal(saved.status, 200);

    const detail = (await (await GET(new Request(`http://localhost/x?key=${KEY}&email=${encodeURIComponent(email)}`))).json()) as {
      guest: { tags: string[]; blocked: boolean }; bookings: unknown[];
    };
    assert.deepEqual([detail.guest.tags, detail.guest.blocked, detail.bookings.length], [["VIP"], true, 1]);
    const blockedList = (await (await GET(new Request(`http://localhost/x?key=${KEY}&filter=blocked`))).json()) as { guests: { email: string }[] };
    assert.ok(blockedList.guests.some((g) => g.email === email));

    const { POST } = await import("@/app/api/reservations/route");
    const attempt = await POST(new Request("http://localhost/api/reservations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Nkem", lastName: "Profile", email: email.toUpperCase(), phone: "+2348011111111", stayPreference: "t",
        message: "t", itemType: "room", roomId: "guest-room", guests: 2, nights: 2, checkIn: "2027-02-01", checkOut: "2027-02-03",
      }),
    }));
    assert.equal(attempt.status, 403);
    assert.equal(((await attempt.json()) as { code: string }).code, "contact_hotel");
  });
});
