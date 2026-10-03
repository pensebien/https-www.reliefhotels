import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

const KEY = "relief-demo-2026";

function inDays(n: number) {
  const d = new Date(Date.now() + 3_600_000);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const ics = (events: [string, string, string][]) =>
  ["BEGIN:VCALENDAR", ...events.flatMap(([uid, a, b]) => ["BEGIN:VEVENT", `UID:${uid}`, `DTSTART;VALUE=DATE:${a.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${b.replace(/-/g, "")}`, "SUMMARY:Reserved", "END:VEVENT"]), "END:VCALENDAR"].join("\r\n");

describe("Channels (calendar sync)", () => {
  before(() => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    delete process.env.DEMO_DASHBOARD_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("imports OTA bookings as blocks, frees cancelled ones, and validates feed links", async () => {
    const { PUT } = await import("@/app/api/staff/settings/channels/route");
    const put = (feeds: unknown) => PUT(new Request(`http://localhost/x?key=${KEY}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feeds }) }));
    assert.equal((await put([{ id: "airbnb-ph", label: "Airbnb", roomId: "presidential-suite", url: "https://192.168.0.10/x.ics", active: true }])).status, 400);
    assert.equal((await put([{ id: "airbnb-ph", label: "Airbnb", roomId: "presidential-suite", url: "https://www.airbnb.com/calendar/ical/1.ics?s=x", active: true }])).status, 200);

    const a = inDays(20), b = inDays(23);
    const { syncChannelFeeds } = await import("@/lib/channels/feeds");
    const status = await syncChannelFeeds(async () => ics([["res-1", a, b]]));
    assert.deepEqual([status["airbnb-ph"].ok, status["airbnb-ph"].events], [true, 1]);

    const { GET: availability } = await import("@/app/api/rooms/availability/route");
    const av = async () => ((await (await availability(new Request(`http://localhost/x?checkIn=${a}&checkOut=${inDays(21)}&guests=2`))).json()) as { available: { id: string }[] }).available.map((r) => r.id);
    assert.equal((await av()).includes("presidential-suite"), false, "the only penthouse is taken on Airbnb");

    await syncChannelFeeds(async () => ics([]));
    assert.equal((await av()).includes("presidential-suite"), true, "cancelled on Airbnb → bookable again");

    const failing = await syncChannelFeeds(async () => { throw new Error("The booking site answered 500"); });
    assert.equal(failing["airbnb-ph"].ok, false);
  });

  it("exports fully booked days behind a signed link", async () => {
    const { addReservation } = await import("@/lib/demo-store");
    const a = inDays(40), b = inDays(42);
    await addReservation({
      firstName: "Ex", lastName: "Port", email: "x@example.com", itemType: "room", roomId: "presidential-suite",
      checkIn: a, checkOut: b, nights: 2, guests: 2, stayPreference: "t", message: "t", emailSent: false, status: "confirmed",
    });
    const { signFeedId } = await import("@/lib/booking-engine/manage-link");
    const { GET } = await import("@/app/api/ical/[roomId]/route");
    const ctx = { params: Promise.resolve({ roomId: "presidential-suite" }) };
    assert.equal((await GET(new Request("http://localhost/x?t=wrong"), ctx)).status, 404);
    const res = await GET(new Request(`http://localhost/x?t=${signFeedId("presidential-suite")}`), ctx);
    assert.equal(res.headers.get("content-type"), "text/calendar; charset=utf-8");
    const body = await res.text();
    assert.ok(body.includes(`DTSTART;VALUE=DATE:${a.replace(/-/g, "")}\r\nDTEND;VALUE=DATE:${b.replace(/-/g, "")}`));
  });
});
