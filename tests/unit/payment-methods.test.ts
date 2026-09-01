import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  paymentChannelForMethod,
  resolveCardTerminalMethod,
} from "@/lib/payment-methods";

describe("resolveCardTerminalMethod", () => {
  it("uses Paystack when only Paystack Terminal is configured", () => {
    const method = resolveCardTerminalMethod({
      paystackTerminalConfigured: true,
      moniepointTerminalConfigured: false,
    });
    assert.equal(method, "paystack_terminal");
  });

  it("uses Moniepoint when only Moniepoint Terminal is configured", () => {
    const method = resolveCardTerminalMethod({
      paystackTerminalConfigured: false,
      moniepointTerminalConfigured: true,
    });
    assert.equal(method, "moniepoint_terminal");
  });

  it("defaults to Moniepoint when both providers are configured", () => {
    const method = resolveCardTerminalMethod({
      paystackTerminalConfigured: true,
      moniepointTerminalConfigured: true,
    });
    assert.equal(method, "moniepoint_terminal");
  });

  it("defaults to Moniepoint when neither provider is configured (demo mode)", () => {
    const method = resolveCardTerminalMethod({
      paystackTerminalConfigured: false,
      moniepointTerminalConfigured: false,
    });
    assert.equal(method, "moniepoint_terminal");
  });
});

describe("paymentChannelForMethod", () => {
  it("maps paystack_terminal to the paystack channel", () => {
    assert.equal(paymentChannelForMethod("paystack_terminal"), "paystack");
  });

  it("maps moniepoint methods to the moniepoint channel", () => {
    assert.equal(paymentChannelForMethod("moniepoint_terminal"), "moniepoint");
    assert.equal(paymentChannelForMethod("moniepoint_transfer"), "moniepoint");
  });

  it("maps cash to the cash channel", () => {
    assert.equal(paymentChannelForMethod("cash"), "cash");
  });
});
