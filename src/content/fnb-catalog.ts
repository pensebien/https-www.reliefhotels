/** Minibar / F&B / laundry / misc charge catalog for the staff folio module (Agent K). */

export type FnbCategory = "minibar" | "snacks" | "laundry" | "misc";

export type FnbCatalogItem = {
  id: string;
  name: string;
  category: FnbCategory;
  priceNgn: number;
};

export const FNB_CATEGORIES: FnbCategory[] = [
  "minibar",
  "snacks",
  "laundry",
  "misc",
];

export const fnbCatalog: FnbCatalogItem[] = [
  // Minibar
  { id: "minibar-water-500", name: "Bottled Water (500ml)", category: "minibar", priceNgn: 1000 },
  { id: "minibar-soft-drink", name: "Assorted Soft Drink (35cl)", category: "minibar", priceNgn: 1500 },
  { id: "minibar-chapman", name: "Chapman Mocktail", category: "minibar", priceNgn: 3500 },

  // Snacks
  { id: "snacks-mixed-nuts", name: "Mixed Nuts (100g)", category: "snacks", priceNgn: 2500 },
  { id: "snacks-plantain-chips", name: "Plantain Chips", category: "snacks", priceNgn: 1800 },
  { id: "snacks-chin-chin", name: "Chin Chin Pack", category: "snacks", priceNgn: 1500 },

  // Laundry
  { id: "laundry-shirt", name: "Laundry — Shirt / Blouse", category: "laundry", priceNgn: 2000 },
  { id: "laundry-trousers", name: "Laundry — Trousers / Skirt", category: "laundry", priceNgn: 2500 },
  { id: "laundry-suit", name: "Laundry — Suit / Native Wear (2pc)", category: "laundry", priceNgn: 6000 },

  // Misc
  { id: "misc-towel-set", name: "Extra Towel Set", category: "misc", priceNgn: 1500 },
  { id: "misc-late-checkout", name: "Late Checkout (2hrs)", category: "misc", priceNgn: 10000 },
  { id: "misc-airport-shuttle", name: "Airport Shuttle (One-way)", category: "misc", priceNgn: 15000 },
];

const catalogBySku = new Map<string, FnbCatalogItem>(
  fnbCatalog.map((item) => [item.id, item]),
);

export function findFnbCatalogItem(sku: string): FnbCatalogItem | undefined {
  return catalogBySku.get(sku);
}

export function fnbCatalogByCategory(): Record<FnbCategory, FnbCatalogItem[]> {
  const grouped: Record<FnbCategory, FnbCatalogItem[]> = {
    minibar: [],
    snacks: [],
    laundry: [],
    misc: [],
  };
  for (const item of fnbCatalog) {
    grouped[item.category].push(item);
  }
  return grouped;
}
