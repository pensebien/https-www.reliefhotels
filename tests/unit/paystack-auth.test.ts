import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPaystackPublicKey,
  isPaystackSecretKey,
  paystackAuthorizationHeader,
  paystackKeyMode,
} from "@/lib/paystack-auth";

describe("paystack-auth (Paystack authentication docs)", () => {
  it("detects test and live secret modes", () => {
    assert.equal(paystackKeyMode("sk_test_abc"), "test");
    assert.equal(paystackKeyMode("sk_live_abc"), "live");
    assert.equal(paystackKeyMode("bad"), "unknown");
  });

  it("validates key prefixes", () => {
    assert.equal(isPaystackSecretKey("sk_test_x"), true);
    assert.equal(isPaystackPublicKey("pk_test_x"), true);
    assert.equal(isPaystackSecretKey("pk_test_x"), false);
  });

  it("builds Authorization: Bearer SECRET_KEY", () => {
    assert.equal(
      paystackAuthorizationHeader("sk_test_r3m3mb3r"),
      "Bearer sk_test_r3m3mb3r",
    );
  });

  it("rejects missing or malformed secret keys", () => {
    assert.throws(() => paystackAuthorizationHeader(""), /missing/i);
    assert.throws(
      () => paystackAuthorizationHeader("pk_test_wrong"),
      /sk_test_|sk_live_/,
    );
  });
});
