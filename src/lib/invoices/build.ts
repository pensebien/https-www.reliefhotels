/**
 * Builds invoice and credit-note documents. Pure: callers pass the booking,
 * its folio charges and payments, tax and invoice settings. Totals always
 * equal what the guest agreed to pay:
 * - rooms and extras: prices include VAT (roomVatPct / extrasVatPct backed out);
 * - folio charges: VAT per tax settings (added on top when pass_through).
 */

import type { StayQuote } from "@/lib/booking-engine/quote";
import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";
import { folioChargeBreakdown, type FolioCharge } from "@/lib/folio/types";
import { formatNaira } from "@/lib/utils";
import type { InvoiceSettings } from "./settings";

export type InvoiceLineKind = "room" | "discount" | "extra" | "folio";

export type InvoiceLine = {
  kind: InvoiceLineKind;
  description: string;
  quantity: number;
  unitPriceNgn: number;
  /** Line total including VAT. Negative for discounts and credit notes. */
  amountNgn: number;
  vatPct: number;
  vatNgn: number;
};

export type InvoicePayment = {
  reference: string;
  method: string;
  date: string;
  amountNgn: number;
};

export type InvoiceKind = "invoice" | "credit_note";

export type InvoiceDocument = {
  kind: InvoiceKind;
  reservation: {
    id: string;
    roomLabel: string;
    roomNumbers: string[];
    checkIn?: string;
    checkOut?: string;
    nights?: number;
    rooms: number;
    guests: number;
  };
  guest: { name: string; email: string; phone?: string };
  payee: { name: string; address: string; taxId: string; bankDetails: string };
  lines: InvoiceLine[];
  payments: InvoicePayment[];
  totals: { netNgn: number; vatNgn: number; grossNgn: number; paidNgn: number; balanceNgn: number };
  paymentTermsDays: number;
  footer: string;
  /** Credit notes: the invoice they reverse, and why. */
  creditFor?: { id: string; number: string };
  reason?: string;
};

function includedVat(amountNgn: number, pct: number): number {
  return pct > 0 ? Math.round((amountNgn * pct) / (100 + pct)) : 0;
}

function roomLines(
  reservation: ReservationRecord,
  quote: StayQuote | undefined,
  roomLabel: string,
  roomVatPct: number,
  catalogNightly: number,
): InvoiceLine[] {
  const units = reservation.units ?? 1;
  const line = (description: string, quantity: number, unit: number, kind: InvoiceLineKind = "room"): InvoiceLine => {
    const amountNgn = quantity * unit;
    return { kind, description, quantity, unitPriceNgn: unit, amountNgn, vatPct: roomVatPct, vatNgn: includedVat(amountNgn, roomVatPct) };
  };
  const roomsSuffix = units > 1 ? ` × ${units} rooms` : "";

  if (!quote) {
    // Older booking without a stored quote: one line at the locked or catalog total.
    const nights = reservation.nights ?? 1;
    const total = reservation.quotedTotalNgn ?? catalogNightly * nights * units;
    return [line(`${roomLabel} — ${nights} night${nights === 1 ? "" : "s"}${roomsSuffix}`, 1, total)];
  }

  // Group consecutive nights at the same rate: "3 nights at ₦95,000".
  const groups: { from: string; nights: number; rate: number }[] = [];
  for (const night of quote.perNight) {
    const last = groups[groups.length - 1];
    if (last && last.rate === night.nightlyNgn) last.nights += 1;
    else groups.push({ from: night.date, nights: 1, rate: night.nightlyNgn });
  }
  const lines = groups.map((g) =>
    line(
      `${roomLabel} — ${g.nights} night${g.nights === 1 ? "" : "s"} from ${g.from} at ${formatNaira(g.rate)}${roomsSuffix}`,
      g.nights * units,
      g.rate,
    ),
  );
  if (quote.longStayDiscountNgn) {
    lines.push(line("Longer-stay discount", 1, -quote.longStayDiscountNgn, "discount"));
  }
  if (quote.couponDiscountNgn) {
    lines.push(line(`Promo code ${quote.couponCode ?? ""}`.trim(), 1, -quote.couponDiscountNgn, "discount"));
  }
  return lines;
}

export type InvoiceStay = {
  reservation: ReservationRecord;
  roomLabel: string;
  roomNumbers: string[];
  catalogNightlyNgn: number;
};

export type BuildInvoiceInput = {
  reservation: ReservationRecord;
  /** Other room-type lines of a group booking, itemised after the lead's rooms. */
  otherStays?: InvoiceStay[];
  roomLabel: string;
  roomNumbers: string[];
  catalogNightlyNgn: number;
  folioCharges: FolioCharge[];
  payments: PaymentRecord[];
  tax: { vatPercentage: number; collectionMode: "absorbed" | "pass_through" };
  settings: InvoiceSettings;
};

export function buildInvoiceDocument(input: BuildInvoiceInput): InvoiceDocument {
  const { reservation, settings, tax } = input;
  const quote = reservation.quoteSnapshot;

  const lines: InvoiceLine[] = [
    ...roomLines(reservation, quote, input.roomLabel, settings.roomVatPct, input.catalogNightlyNgn),
    ...(input.otherStays ?? []).flatMap((stay) =>
      roomLines(stay.reservation, stay.reservation.quoteSnapshot, stay.roomLabel, settings.roomVatPct, stay.catalogNightlyNgn),
    ),
    ...(quote?.extras ?? []).map((extra) => ({
      kind: "extra" as const,
      description: extra.label,
      quantity: 1,
      unitPriceNgn: extra.totalNgn,
      amountNgn: extra.totalNgn,
      vatPct: settings.extrasVatPct,
      vatNgn: includedVat(extra.totalNgn, settings.extrasVatPct),
    })),
  ];

  const folio = input.folioCharges.filter((c) => c.status !== "void");
  for (const charge of folio) {
    const b = folioChargeBreakdown(charge, tax);
    lines.push({
      kind: "folio",
      description: charge.name,
      quantity: charge.qty,
      unitPriceNgn: charge.unitPriceNgn,
      amountNgn: b.totalNgn,
      vatPct: tax.vatPercentage,
      vatNgn: b.taxNgn,
    });
  }

  const payments: InvoicePayment[] = input.payments
    .filter((p) => p.status === "success")
    .map((p) => ({
      reference: p.reference,
      method: p.paymentMethod ?? p.paymentChannel ?? "paystack",
      date: p.createdAt,
      amountNgn: Math.round(p.amountKobo / 100),
    }));
  // Folio items settled at the outlet are paid already.
  for (const charge of folio.filter((c) => c.status === "paid")) {
    payments.push({
      reference: `FOLIO-${charge.id.slice(0, 8)}`,
      method: "paid_at_outlet",
      date: charge.paidAt ?? charge.createdAt,
      amountNgn: folioChargeBreakdown(charge, tax).totalNgn,
    });
  }

  const grossNgn = lines.reduce((sum, l) => sum + l.amountNgn, 0);
  const vatNgn = lines.reduce((sum, l) => sum + l.vatNgn, 0);
  const paidNgn = payments.reduce((sum, p) => sum + p.amountNgn, 0);

  return {
    kind: "invoice",
    reservation: {
      id: reservation.id,
      roomLabel: input.roomLabel,
      roomNumbers: [...input.roomNumbers, ...(input.otherStays ?? []).flatMap((s) => s.roomNumbers)],
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      nights: reservation.nights,
      rooms: [reservation, ...(input.otherStays ?? []).map((s) => s.reservation)].reduce((n, r) => n + (r.units ?? 1), 0),
      guests: [reservation, ...(input.otherStays ?? []).map((s) => s.reservation)].reduce((n, r) => n + r.guests, 0),
    },
    guest: {
      name: `${reservation.firstName} ${reservation.lastName}`,
      email: reservation.email,
      phone: reservation.phone,
    },
    payee: {
      name: settings.payeeName,
      address: settings.payeeAddress,
      taxId: settings.payeeTaxId,
      bankDetails: settings.bankDetails,
    },
    lines,
    payments,
    totals: { netNgn: grossNgn - vatNgn, vatNgn, grossNgn, paidNgn, balanceNgn: grossNgn - paidNgn },
    paymentTermsDays: settings.paymentTermsDays,
    footer: settings.footer,
  };
}

/** Full reversal of an issued invoice: every line negated, nothing paid. */
export function buildCreditNote(
  original: InvoiceDocument,
  originalRef: { id: string; number: string },
  reason: string,
): InvoiceDocument {
  const lines = original.lines.map((l) => ({
    ...l,
    quantity: -l.quantity,
    amountNgn: -l.amountNgn,
    vatNgn: -l.vatNgn,
  }));
  const grossNgn = -original.totals.grossNgn;
  const vatNgn = -original.totals.vatNgn;
  return {
    ...original,
    kind: "credit_note",
    lines,
    payments: [],
    totals: { netNgn: grossNgn - vatNgn, vatNgn, grossNgn, paidNgn: 0, balanceNgn: grossNgn },
    creditFor: originalRef,
    reason,
  };
}
