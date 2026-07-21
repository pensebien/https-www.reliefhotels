import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

/**
 * Ensures demo=1 cannot confirm paid bookings when Paystack keys are configured
 * (business case: 20 paid bookings/month must be real charges).
 */
describe("Paystack verify demo bypass gate", () => {
  before(() => {
    process.env.DEMO_MODE = "false";
    process.env.NOTIFY_CHANNEL = "console";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
    process.env.PAYSTACK_SECRET_KEY = "sk_test_gatecheck_not_a_real_key_but_valid_prefix";
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY =
      "pk_test_gatecheck_not_a_real_key_but_valid_prefix";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("rejects demo=1 when not in demoMode (keys present)", async () => {
    const { getServerConfig } = await import("@/lib/config");
    // Bust any cached module state by re-reading env
    const config = getServerConfig();
    assert.equal(config.demoMode, false);
    assert.equal(config.paystack.configured, true);

    const { verifyPayment } = await import("@/lib/paystack");
    const result = await verifyPayment("RH-20260721-deadbeef", true);
    // Bypass flag ignored — without a real Paystack transaction this fails/pending
    assert.equal(result.demo, false);
    assert.notEqual(result.status, "success");
  });
});
