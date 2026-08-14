import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffPaystackTransactions } from "@/lib/accounting/paystack-reconcile";

describe("diffPaystackTransactions", () => {
  it("reports no discrepancies when local and remote match exactly", () => {
    const discrepancies = diffPaystackTransactions(
      [{ reference: "RH-1", amountKobo: 500000, status: "success" }],
      [{ reference: "RH-1", amountKobo: 500000, status: "success" }],
    );
    assert.deepEqual(discrepancies, []);
  });

  it("flags an amount mismatch", () => {
    const discrepancies = diffPaystackTransactions(
      [{ reference: "RH-1", amountKobo: 500000, status: "success" }],
      [{ reference: "RH-1", amountKobo: 450000, status: "success" }],
    );
    assert.equal(discrepancies.length, 1);
    assert.equal(discrepancies[0]?.type, "amount_mismatch");
    assert.equal(discrepancies[0]?.localAmountKobo, 500000);
    assert.equal(discrepancies[0]?.paystackAmountKobo, 450000);
  });

  it("flags a status mismatch when amounts agree but Paystack disagrees on success", () => {
    const discrepancies = diffPaystackTransactions(
      [{ reference: "RH-1", amountKobo: 500000, status: "success" }],
      [{ reference: "RH-1", amountKobo: 500000, status: "abandoned" }],
    );
    assert.equal(discrepancies.length, 1);
    assert.equal(discrepancies[0]?.type, "status_mismatch");
  });

  it("flags a local success payment Paystack has no record of", () => {
    const discrepancies = diffPaystackTransactions(
      [{ reference: "RH-1", amountKobo: 500000, status: "success" }],
      [],
    );
    assert.equal(discrepancies.length, 1);
    assert.equal(discrepancies[0]?.type, "missing_on_paystack");
  });

  it("flags a Paystack success transaction with no local record", () => {
    const discrepancies = diffPaystackTransactions(
      [],
      [{ reference: "RH-GHOST", amountKobo: 500000, status: "success" }],
    );
    assert.equal(discrepancies.length, 1);
    assert.equal(discrepancies[0]?.type, "missing_locally");
    assert.equal(discrepancies[0]?.reference, "RH-GHOST");
  });

  it("ignores local payments that never succeeded", () => {
    const discrepancies = diffPaystackTransactions(
      [{ reference: "RH-1", amountKobo: 500000, status: "pending" }],
      [],
    );
    assert.deepEqual(discrepancies, []);
  });

  it("ignores Paystack transactions that never succeeded", () => {
    const discrepancies = diffPaystackTransactions(
      [],
      [{ reference: "RH-1", amountKobo: 500000, status: "abandoned" }],
    );
    assert.deepEqual(discrepancies, []);
  });
});
