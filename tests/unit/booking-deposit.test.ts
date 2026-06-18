import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDepositNgn } from "@/lib/booking-deposit";

describe("calculateDepositNgn", () => {
  it("charges 20% of room rate × nights", () => {
    assert.equal(calculateDepositNgn("room", 185_000, 2, 2), 74_000);
    assert.equal(calculateDepositNgn("room", 95_000, 1, 1), 19_000);
  });

  it("charges tour price × guests", () => {
    assert.equal(calculateDepositNgn("tour", 35_000, 1, 2), 70_000);
  });
});
