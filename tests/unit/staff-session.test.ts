import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createStaffSessionToken,
  isStaffAuthEnabled,
  verifyStaffSessionToken,
} from "@/lib/staff-session";

describe("staff-session", () => {
  it("round-trips a signed token and rejects tampering", () => {
    process.env.STAFF_AUTH_ENABLED = "true";
    process.env.STAFF_SESSION_SECRET = "test-secret-value";

    assert.equal(isStaffAuthEnabled(), true);

    const token = createStaffSessionToken({
      accountId: "acc-1",
      name: "Ada",
      role: "manager",
    });

    const verified = verifyStaffSessionToken(token);
    assert.ok(verified);
    assert.equal(verified?.accountId, "acc-1");
    assert.equal(verified?.role, "manager");

    const tampered = token.slice(0, -2) + "xx";
    assert.equal(verifyStaffSessionToken(tampered), null);
  });

  it("rejects an expired token", () => {
    process.env.STAFF_AUTH_ENABLED = "true";
    process.env.STAFF_SESSION_SECRET = "test-secret-value";

    const expiredPayload = {
      accountId: "acc-1",
      name: "Ada",
      role: "manager",
      exp: Date.now() - 1000,
    };
    const encoded = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
    const signature = createHmac("sha256", "test-secret-value")
      .update(encoded)
      .digest("base64url");

    assert.equal(verifyStaffSessionToken(`${encoded}.${signature}`), null);
  });

  it("isStaffAuthEnabled is false without a session secret", () => {
    process.env.STAFF_AUTH_ENABLED = "true";
    delete process.env.STAFF_SESSION_SECRET;

    assert.equal(isStaffAuthEnabled(), false);

    // restore for any later test relying on the flag being usable
    process.env.STAFF_SESSION_SECRET = "test-secret-value";
  });
});
