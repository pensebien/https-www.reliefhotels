import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createBankTransferApprovalToken,
  verifyBankTransferApprovalToken,
} from "@/lib/bank-transfer-link";

describe("bank-transfer-link", () => {
  it("round-trips a valid token and extracts the reference", () => {
    process.env.BANK_TRANSFER_LINK_SECRET = "test-bank-transfer-secret";

    const token = createBankTransferApprovalToken("RH-BTM-20260903-abc123");
    assert.ok(token);

    const verified = verifyBankTransferApprovalToken(token);
    assert.ok(verified);
    assert.equal(verified?.reference, "RH-BTM-20260903-abc123");
  });

  it("rejects a tampered signature", () => {
    process.env.BANK_TRANSFER_LINK_SECRET = "test-bank-transfer-secret";

    const token = createBankTransferApprovalToken("RH-BTM-20260903-abc123");
    assert.ok(token);

    const tampered = `${token!.slice(0, -2)}xx`;
    assert.equal(verifyBankTransferApprovalToken(tampered), null);
  });

  it("rejects an expired token", () => {
    process.env.BANK_TRANSFER_LINK_SECRET = "test-bank-transfer-secret";

    const expiredPayload = {
      reference: "RH-BTM-20260903-abc123",
      exp: Date.now() - 1000,
    };
    const encoded = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
    const signature = createHmac("sha256", "test-bank-transfer-secret")
      .update(encoded)
      .digest("base64url");

    assert.equal(verifyBankTransferApprovalToken(`${encoded}.${signature}`), null);
  });

  it("returns null when BANK_TRANSFER_LINK_SECRET is unset", () => {
    delete process.env.BANK_TRANSFER_LINK_SECRET;

    assert.equal(createBankTransferApprovalToken("RH-BTM-20260903-abc123"), null);
    assert.equal(verifyBankTransferApprovalToken("anything.here"), null);

    // restore for any later test relying on the secret being usable
    process.env.BANK_TRANSFER_LINK_SECRET = "test-bank-transfer-secret";
  });
});
