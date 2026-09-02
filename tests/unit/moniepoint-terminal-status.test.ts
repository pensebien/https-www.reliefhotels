import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { getTerminalTransactionStatus } from "@/lib/moniepoint";

describe("getTerminalTransactionStatus", () => {
  const originalDemoMode = process.env.DEMO_MODE;

  before(() => {
    delete process.env.MONIEPOINT_CLIENT_ID;
    delete process.env.MONIEPOINT_CLIENT_SECRET;
    delete process.env.MONIEPOINT_TERMINAL_SERIAL;
  });

  after(() => {
    if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = originalDemoMode;
  });

  it("stays pending when Moniepoint is unconfigured and DEMO_MODE is not explicitly set", async () => {
    delete process.env.DEMO_MODE;
    const status = await getTerminalTransactionStatus("RH-MPOS-TEST-1");
    assert.equal(status.processingStatus, "PENDING");
  });

  it("auto-approves when DEMO_MODE=true, even though unconfigured (local/QA convenience)", async () => {
    process.env.DEMO_MODE = "true";
    const status = await getTerminalTransactionStatus("RH-MPOS-TEST-2");
    assert.equal(status.processingStatus, "PROCESSED");
  });
});
