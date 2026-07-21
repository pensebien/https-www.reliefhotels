import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("GET /api/health", () => {
  it("returns storage mode without secrets", async () => {
    process.env.DEMO_MODE = "true";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const data = (await res.json()) as {
      ok: boolean;
      storage: { mode: string; message: string };
      productionReady: boolean;
      demoMode?: boolean;
      paystackMode?: string;
    };

    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.storage.mode, "file");
    assert.equal(data.productionReady, false);
    assert.equal(data.demoMode, true);
    assert.ok(data.storage.message.includes("file store"));
  });
});
