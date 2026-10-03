import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { after, before, describe, it } from "node:test";
import { dataPath } from "@/lib/data-dir";

describe("Custom booking questions", () => {
  before(async () => {
    process.env.DEMO_MODE = "true";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { saveRateConfig, DEFAULT_RATE_CONFIG } = await import("@/lib/booking-engine/rate-config");
    await saveRateConfig({
      ...DEFAULT_RATE_CONFIG,
      engine: {
        ...DEFAULT_RATE_CONFIG.engine,
        customFields: [
          { id: "invoice-company", label: "Company name for the invoice", type: "text", required: true },
          { id: "birthday", label: "Celebrating a birthday?", type: "checkbox", required: false },
        ],
      },
    });
  });
  after(async () => {
    await fs.rm(dataPath("rate-config.json"), { force: true });
    const { clearRateConfigCache } = await import("@/lib/booking-engine/rate-config");
    clearRateConfigCache();
  });

  it("requires required answers, keeps known ones under the question, drops unknown ones", async () => {
    const { POST } = await import("@/app/api/reservations/route");
    const book = (customFields?: Record<string, unknown>) =>
      POST(new Request("http://localhost/api/reservations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Cf", lastName: "Test", email: `cf-${Date.now()}@example.com`, phone: "+2348000000000",
          stayPreference: "t", message: "t", itemType: "room", roomId: "guest-room", guests: 2, nights: 2,
          checkIn: "2041-03-01", checkOut: "2041-03-03", customFields,
        }),
      }));
    const missing = await book({ birthday: true });
    assert.equal(missing.status, 400);
    assert.match(((await missing.json()) as { error: string }).error, /Company name for the invoice/);

    const ok = await book({ "invoice-company": "  Calabar Ports Ltd ", birthday: true, injected: "x" });
    assert.equal(ok.status, 200);
    const { findReservationById } = await import("@/lib/demo-store");
    const record = await findReservationById(((await ok.json()) as { id: string }).id);
    assert.deepEqual(record?.customFields, { "Company name for the invoice": "Calabar Ports Ltd", "Celebrating a birthday?": true });
  });
});
