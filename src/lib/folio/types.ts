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
