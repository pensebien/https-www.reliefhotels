import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractPaymentReference,
  isSuccessfulWebhookPayload,
} from "@/lib/moniepoint-sync";

describe("moniepoint-sync", () => {
  it("extracts payment reference from webhook payloads", () => {
    assert.equal(
      extractPaymentReference({ merchantReference: "RH-MPTF-20260621-abc123" }),
      "RH-MPTF-20260621-abc123",
    );
    assert.equal(
      extractPaymentReference({
        narration: "Deposit RH-MPTF-20260621-abc123 for Relief Hotels",
      }),
      "RH-MPTF-20260621-ABC123",
    );
  });

  it("detects successful webhook status", () => {
    assert.equal(
      isSuccessfulWebhookPayload({
        processingStatus: "PROCESSED",
        responseCode: "00",
      }),
      true,
    );
  });
});
