import type { FnbReservation, FolioCharge } from "@/features/fnb/types";

export function parseFnbYmd(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export function formatFnbDate(ymd?: string): string {
  if (!ymd) return "—";
  const date = parseFnbYmd(ymd);
  if (!date) return ymd;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function guestFullName(reservation: FnbReservation): string {
  const name = `${reservation.firstName ?? ""} ${reservation.lastName ?? ""}`.trim();
  return name || reservation.email;
}

export function folioChargeTotalNgn(charge: FolioCharge): number {
  return charge.qty * charge.unitPriceNgn;
}

export function folioOpenBalanceNgn(charges: FolioCharge[]): number {
  return charges
    .filter((c) => c.status === "open" || c.status === "posted")
    .reduce((sum, c) => sum + folioChargeTotalNgn(c), 0);
}

export type FolioTaxBreakdown = {
  subtotalNgn: number;
  taxNgn: number;
  totalNgn: number;
};

/**
 * pass_through: unitPriceNgn is pre-tax, VAT is added on top (itemized).
 * absorbed: unitPriceNgn already includes VAT — backed out for display only.
 * Mirrors src/lib/folio/types.ts's folioChargeBreakdown (server-side) —
 * kept as an independent copy per this feature folder's existing convention.
 */
export function folioChargeBreakdown(
  charge: FolioCharge,
  tax: { vatPercentage: number; collectionMode: "absorbed" | "pass_through" },
): FolioTaxBreakdown {
  const base = folioChargeTotalNgn(charge);
  const rate = tax.vatPercentage / 100;

  if (tax.collectionMode === "pass_through") {
    const taxNgn = Math.round(base * rate);
    return { subtotalNgn: base, taxNgn, totalNgn: base + taxNgn };
  }

  const subtotalNgn = Math.round(base / (1 + rate));
  return { subtotalNgn, taxNgn: base - subtotalNgn, totalNgn: base };
}
