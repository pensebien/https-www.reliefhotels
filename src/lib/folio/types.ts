/** Folio (minibar / F&B) charge types — Agent K. */

export type FolioChargeStatus = "open" | "posted" | "paid" | "void";

export const FOLIO_CHARGE_STATUSES: FolioChargeStatus[] = [
  "open",
  "posted",
  "paid",
  "void",
];

/** A statuses is terminal once it can no longer transition. */
export function isTerminalFolioStatus(status: FolioChargeStatus): boolean {
  return status === "paid" || status === "void";
}

export type FolioCharge = {
  id: string;
  reservationId: string;
  sku: string;
  name: string;
  qty: number;
  unitPriceNgn: number;
  status: FolioChargeStatus;
  createdAt: string;
  paidAt?: string;
};

export function folioChargeTotalNgn(charge: FolioCharge): number {
  return charge.qty * charge.unitPriceNgn;
}

export type TaxBreakdown = {
  subtotalNgn: number;
  taxNgn: number;
  totalNgn: number;
};

/**
 * `pass_through`: charge.unitPriceNgn is the pre-tax price — VAT is added
 * on top, itemized (the guest sees Subtotal + VAT = Total).
 * `absorbed`: charge.unitPriceNgn already includes VAT — back it out for
 * display only; the guest still sees one price, the hotel remits from margin.
 */
export function folioChargeBreakdown(
  charge: FolioCharge,
  tax: { vatPercentage: number; collectionMode: "absorbed" | "pass_through" },
): TaxBreakdown {
  const base = folioChargeTotalNgn(charge);
  const rate = tax.vatPercentage / 100;

  if (tax.collectionMode === "pass_through") {
    const taxNgn = Math.round(base * rate);
    return { subtotalNgn: base, taxNgn, totalNgn: base + taxNgn };
  }

  const subtotalNgn = Math.round(base / (1 + rate));
  return { subtotalNgn, taxNgn: base - subtotalNgn, totalNgn: base };
}
