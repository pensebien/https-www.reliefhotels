import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDepositNgn } from "@/lib/booking-deposit";

describe("calculateDepositNgn", () => {
  it("charges 20% of room rate × nights", () => {
    assert.equal(calculateDepositNgn(185_000, 2), 74_000);
    assert.equal(calculateDepositNgn(95_000, 1), 19_000);
  });
});
