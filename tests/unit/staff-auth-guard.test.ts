import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { requireStaffAccess } from "@/lib/staff-auth-guard";

describe("requireStaffAccess", () => {
  before(() => {
    delete process.env.STAFF_AUTH_ENABLED;
    delete process.env.STAFF_SESSION_SECRET;
    delete process.env.DEMO_DASHBOARD_KEY;
  });

  it("legacy mode: accepts the shared dashboard key regardless of role", async () => {
    const request = new Request(
      "http://localhost/api/staff/room-blocks?key=relief-demo-2026",
    );
    const result = await requireStaffAccess(request, ["cleaner_head"]);
    assert.equal(result.ok, true);
  });

  it("legacy mode: rejects a missing/invalid key", async () => {
    const request = new Request("http://localhost/api/staff/room-blocks?key=wrong");
    const result = await requireStaffAccess(request);
    assert.equal(result.ok, false);
  });

  it("enabled mode: rejects a request with no session cookie", async () => {
    process.env.STAFF_AUTH_ENABLED = "true";
    process.env.STAFF_SESSION_SECRET = "test-secret-value";

    const request = new Request("http://localhost/api/staff/room-blocks");
    const result = await requireStaffAccess(request, ["cleaner_head"]);
    assert.equal(result.ok, false);

    delete process.env.STAFF_AUTH_ENABLED;
    delete process.env.STAFF_SESSION_SECRET;
  });
});
