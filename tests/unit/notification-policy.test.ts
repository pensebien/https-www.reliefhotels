import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { notifyManager } from "@/lib/notifications";

const basePayload = {
  referenceId: "test-ref-001",
  guestName: "QA Tester",
  email: "qa@example.com",
  summary: "Test summary",
};

describe("notifyManager anti-spam policy", () => {
  const prevChannel = process.env.NOTIFY_CHANNEL;

  afterEach(() => {
    if (prevChannel === undefined) delete process.env.NOTIFY_CHANNEL;
    else process.env.NOTIFY_CHANNEL = prevChannel;
  });

  it("blocks SMS/WhatsApp for reservation.created", async () => {
    process.env.NOTIFY_CHANNEL = "sms";
    const result = await notifyManager({
      event: "reservation.created",
      ...basePayload,
    });
    assert.equal(result.sent, false);
    assert.equal(result.provider, "payment-required");
  });

  it("blocks SMS/WhatsApp for event.inquiry.created", async () => {
    process.env.NOTIFY_CHANNEL = "both";
    const result = await notifyManager({
      event: "event.inquiry.created",
      ...basePayload,
    });
    assert.equal(result.sent, false);
    assert.equal(result.provider, "payment-required");
  });

  it("allows payment.verified to proceed (console mode)", async () => {
    process.env.NOTIFY_CHANNEL = "console";
    const result = await notifyManager({
      event: "payment.verified",
      ...basePayload,
      summary: "₦74,000 deposit — signature-suite",
    });
    assert.equal(result.channel, "console");
  });
});
