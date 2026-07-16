"use client";

import { fnbCatalogByCategory, type FnbCategory } from "@/content/fnb-catalog";
import { formatNaira } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const CATEGORY_ORDER: FnbCategory[] = ["minibar", "snacks", "laundry", "misc"];

export function FnbCatalogBrowser({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (sku: string, qty: number) => void;
}) {
  const t = useTranslations("fnb");
  const grouped = fnbCatalogByCategory();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  function qtyFor(sku: string): number {
    return quantities[sku] ?? 1;
  }

  function setQty(sku: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [sku]: Math.max(1, Math.min(50, qty)) }));
  }

  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map((category) => (
        <div key={category}>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">
            {t(`categories.${category}`)}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {grouped[category].map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted">{formatNaira(item.priceNgn)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-full border border-border">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setQty(item.id, qtyFor(item.id) - 1)}
                      className="rounded-l-full p-1.5 hover:bg-background disabled:opacity-50"
                      aria-label={t("decreaseQty")}
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <span className="w-6 text-center text-xs">{qtyFor(item.id)}</span>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setQty(item.id, qtyFor(item.id) + 1)}
                      className="rounded-r-full p-1.5 hover:bg-background disabled:opacity-50"
                      aria-label={t("increaseQty")}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onAdd(item.id, qtyFor(item.id))}
                    className="rounded-full bg-teal px-3 py-1.5 text-xs font-medium text-gray-950 hover:bg-teal-dark disabled:opacity-60"
                  >
                    {t("addCharge")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
