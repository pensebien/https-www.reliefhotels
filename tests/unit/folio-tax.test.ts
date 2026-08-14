import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { folioChargeBreakdown, type FolioCharge } from "@/lib/folio/types";
import { folioChargeBreakdown as folioChargeBreakdownFeature } from "@/features/fnb/lib/helpers";
import type { FolioCharge as FeatureFolioCharge } from "@/features/fnb/types";

function charge(overrides: Partial<FolioCharge> = {}): FolioCharge {
  return {
    id: "c1",
    reservationId: "r1",
    sku: "minibar-water",
    name: "Bottled Water",
    qty: 2,
    unitPriceNgn: 1000,
    status: "open",
    createdAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("folioChargeBreakdown (pass_through — VAT added on top)", () => {
  it("adds VAT on top of the pre-tax price", () => {
    const b = folioChargeBreakdown(charge(), {
      vatPercentage: 7.5,
      collectionMode: "pass_through",
    });
    // base = 2 * 1000 = 2000; VAT = 150; total = 2150
    assert.equal(b.subtotalNgn, 2000);
    assert.equal(b.taxNgn, 150);
    assert.equal(b.totalNgn, 2150);
  });

  it("zero rate means zero tax", () => {
    const b = folioChargeBreakdown(charge(), {
      vatPercentage: 0,
      collectionMode: "pass_through",
    });
    assert.equal(b.taxNgn, 0);
    assert.equal(b.totalNgn, b.subtotalNgn);
  });
});

describe("folioChargeBreakdown (absorbed — VAT backed out of the displayed price)", () => {
  it("backs the VAT out of a tax-inclusive price without changing the total", () => {
    const b = folioChargeBreakdown(charge({ qty: 1, unitPriceNgn: 2150 }), {
      vatPercentage: 7.5,
      collectionMode: "absorbed",
    });
    assert.equal(b.totalNgn, 2150, "absorbed mode never changes the charged total");
    assert.equal(b.subtotalNgn + b.taxNgn, b.totalNgn);
    assert.equal(b.subtotalNgn, 2000);
  });
});

describe("feature-local folioChargeBreakdown copy stays in sync with the lib version", () => {
  function featureCharge(overrides: Partial<FeatureFolioCharge> = {}): FeatureFolioCharge {
    return {
      id: "c1",
      reservationId: "r1",
      sku: "minibar-water",
      name: "Bottled Water",
      qty: 2,
      unitPriceNgn: 1000,
      status: "open",
      createdAt: "2026-08-01T00:00:00Z",
      ...overrides,
    };
  }

  it("produces identical results to the server-side helper", () => {
    const tax = { vatPercentage: 7.5, collectionMode: "pass_through" as const };
    const a = folioChargeBreakdown(charge(), tax);
    const b = folioChargeBreakdownFeature(featureCharge(), tax);
    assert.deepEqual(a, b);
  });
});
