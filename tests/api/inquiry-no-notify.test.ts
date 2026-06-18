import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

describe("Inquiry APIs do not notify manager before payment", () => {
  before(() => {
    process.env.NOTIFY_CHANNEL = "console";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("POST /api/event-inquiries returns notified:false", async () => {
    const { POST } = await import("@/app/api/event-inquiries/route");
    const res = await POST(
      new Request("http://localhost/api/event-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Event",
          lastName: "QA",
          email: "event-qa@example.com",
          phone: "+2348000000001",
          eventType: "corporate",
          eventDate: "2026-09-01",
          guestCount: "40",
          message: "Automated test inquiry",
        }),
      }),
    );
    const data = (await res.json()) as { ok?: boolean; notified?: boolean };
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.notified, false);
  });

  it("POST /api/dining-reservations returns notified:false", async () => {
    const { POST } = await import("@/app/api/dining-reservations/route");
    const res = await POST(
      new Request("http://localhost/api/dining-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Dining",
          lastName: "QA",
          email: "dining-qa@example.com",
          venue: "Rooftop",
          reservationDate: "2026-09-15",
          reservationTime: "19:00",
          partySize: "4",
        }),
      }),
    );
    const data = (await res.json()) as { ok?: boolean; notified?: boolean };
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.notified, false);
  });
});
