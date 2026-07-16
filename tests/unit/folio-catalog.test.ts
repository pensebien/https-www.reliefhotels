import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fnbCatalog,
  fnbCatalogByCategory,
  findFnbCatalogItem,
} from "@/content/fnb-catalog";
import { folioChargeTotalNgn, isTerminalFolioStatus } from "@/lib/folio/types";

describe("fnb-catalog", () => {
  it("has around 12 items across all four categories", () => {
    assert.equal(fnbCatalog.length, 12);
    const categories = new Set(fnbCatalog.map((item) => item.category));
    assert.deepEqual(
      [...categories].sort(),
      ["laundry", "minibar", "misc", "snacks"],
    );
  });

  it("every item has a positive NGN price and a unique sku", () => {
    const skus = new Set<string>();
    for (const item of fnbCatalog) {
      assert.ok(item.priceNgn > 0, `${item.id} should have a positive price`);
      assert.ok(!skus.has(item.id), `${item.id} should be unique`);
      skus.add(item.id);
    }
  });

  it("findFnbCatalogItem looks up a known sku", () => {
    const item = findFnbCatalogItem("minibar-water-500");
    assert.ok(item);
    assert.equal(item?.category, "minibar");
    assert.equal(item?.name, "Bottled Water (500ml)");
  });

  it("findFnbCatalogItem returns undefined for an unknown sku", () => {
    assert.equal(findFnbCatalogItem("does-not-exist"), undefined);
  });

  it("fnbCatalogByCategory groups every item under its category", () => {
    const grouped = fnbCatalogByCategory();
    const total = Object.values(grouped).reduce((sum, items) => sum + items.length, 0);
    assert.equal(total, fnbCatalog.length);
    for (const item of grouped.minibar) {
      assert.equal(item.category, "minibar");
    }
  });
});

describe("folio charge helpers", () => {
  it("folioChargeTotalNgn multiplies qty by unit price", () => {
    const charge = {
      id: "c1",
      reservationId: "r1",
      sku: "minibar-water-500",
      name: "Bottled Water (500ml)",
      qty: 3,
      unitPriceNgn: 1000,
      status: "open" as const,
      createdAt: new Date().toISOString(),
    };
    assert.equal(folioChargeTotalNgn(charge), 3000);
  });

  it("isTerminalFolioStatus is true only for paid/void", () => {
    assert.equal(isTerminalFolioStatus("open"), false);
    assert.equal(isTerminalFolioStatus("posted"), false);
    assert.equal(isTerminalFolioStatus("paid"), true);
    assert.equal(isTerminalFolioStatus("void"), true);
  });
});
