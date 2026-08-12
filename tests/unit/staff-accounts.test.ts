import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPin, verifyPin } from "@/lib/staff-accounts";

describe("staff-accounts PIN hashing", () => {
  it("verifies a correct PIN against its hash", () => {
    const hash = hashPin("1234");
    assert.equal(verifyPin("1234", hash), true);
  });

  it("rejects an incorrect PIN", () => {
    const hash = hashPin("1234");
    assert.equal(verifyPin("9999", hash), false);
  });

  it("produces a different hash each time (random salt)", () => {
    assert.notEqual(hashPin("1234"), hashPin("1234"));
  });

  it("rejects a malformed stored hash", () => {
    assert.equal(verifyPin("1234", "not-a-valid-hash"), false);
  });
});
