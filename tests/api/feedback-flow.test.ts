import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.NOTIFY_CHANNEL = "console";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
  delete process.env.TERMII_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.RESEND_API_KEY;
}

describe("Guest feedback API (contact form)", () => {
  before(() => {
    setTestEnv();
  });

  it("POST /api/feedback stores guest message outside reservations", async () => {
    const { POST } = await import("@/app/api/feedback/route");
    const email = `feedback-${Date.now()}@example.com`;
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Ada",
          lastName: "Okon",
          email,
          phone: "+2348012345678",
          message: "Loved the suite — please share spa hours.",
        }),
      }),
    );
    const data = (await res.json()) as {
      ok?: boolean;
      id?: string;
      notified?: boolean;
    };

    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.ok(data.id);
    assert.equal(data.notified, false);

    const { getGuestFeedback } = await import("@/lib/inquiry-store");
    const { getActivity } = await import("@/lib/demo-store");
    const messages = await getGuestFeedback();
    const match = messages.find((m) => m.id === data.id);
    assert.ok(match);
    assert.equal(match?.email, email);
    assert.equal(match?.firstName, "Ada");

    const activity = await getActivity();
    assert.ok(!activity.reservations.some((r) => r.id === data.id));
  });

  it("POST /api/feedback rejects message-only payload", async () => {
    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "orphan message" }),
      }),
    );
    assert.equal(res.status, 400);
  });
});
