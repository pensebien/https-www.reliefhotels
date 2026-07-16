/**
 * Pure ledger helpers for the staff accounting view. Independent of other
 * agents' files by design (mirrors the pattern in `@/lib/cashier/types`) so
 * this module compiles and is testable regardless of the shape other staff
 * features evolve toward. Inputs are duck-typed against the payment fields
 * already exposed by `GET /api/demo/activity`.
 */

export type LedgerChannel = "cash" | "paystack" | "moniepoint";

export const LEDGER_CHANNELS: readonly LedgerChannel[] = [
  "cash",
  "paystack",
  "moniepoint",
];

/** Shape of a single entry from `GET /api/demo/activity` → `payments`. */
export type LedgerPaymentInput = {
  id: string;
  reference: string;
  reservationId?: string;
  email?: string;
  amountKobo: number;
  status: string;
  paymentMethod?: string;
  paymentChannel?: string;
  itemType?: string;
  itemLabel?: string;
  source?: string;
  createdAt: string;
};

/** Optional non-payment folio charges (e.g. room service, minibar) a caller may pass in. */
export type LedgerFolioCharge = {
  id: string;
  reservationId?: string;
  label: string;
  amountKobo: number;
  channel?: LedgerChannel;
  status?: string;
  createdAt: string;
};

export type LedgerRowKind = "payment" | "folio_charge";

export type LedgerRow = {
  id: string;
  kind: LedgerRowKind;
  reference?: string;
  reservationId?: string;
  guestEmail?: string;
  description: string;
  channel: LedgerChannel;
  paymentMethod?: string;
  status: string;
  amountNgn: number;
  createdAt: string;
  /** `YYYY-MM-DD`, used for date-range filtering and display. */
  dateYmd: string;
};

export type LedgerDateRange = {
  /** Inclusive lower bound, `YYYY-MM-DD`. */
  from?: string;
  /** Inclusive upper bound, `YYYY-MM-DD`. */
  to?: string;
};

export type LedgerChannelSummary = {
  cash: number;
  paystack: number;
  moniepoint: number;
  totalNgn: number;
  count: number;
};

export type LedgerMethodSummaryEntry = {
  amountNgn: number;
  count: number;
};

export function koboToNgn(amountKobo: number): number {
  return Math.round(amountKobo) / 100;
}

function toDateYmd(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Front-desk deposits settled by the cashier record an explicit
 * `paymentChannel` / `paymentMethod` (ADR-005). Guest online-checkout
 * deposits never set either field, since they only ever go through
 * Paystack — so an unset method defaults to the `paystack` channel.
 */
export function resolveLedgerChannel(payment: {
  paymentChannel?: string;
  paymentMethod?: string;
}): LedgerChannel {
  const channel = payment.paymentChannel?.toLowerCase();
  if (channel === "cash" || channel === "paystack" || channel === "moniepoint") {
    return channel;
  }

  const method = payment.paymentMethod?.toLowerCase();
  if (method === "cash") return "cash";
  if (method === "moniepoint_terminal" || method === "moniepoint_transfer") {
    return "moniepoint";
  }
  return "paystack";
}

export function buildLedgerRowsFromPayments(
  payments: readonly LedgerPaymentInput[],
): LedgerRow[] {
  return payments.map((payment) => ({
    id: payment.id,
    kind: "payment" as const,
    reference: payment.reference,
    reservationId: payment.reservationId,
    guestEmail: payment.email,
    description: payment.itemLabel ?? payment.itemType ?? "Payment",
    channel: resolveLedgerChannel(payment),
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    amountNgn: koboToNgn(payment.amountKobo),
    createdAt: payment.createdAt,
    dateYmd: toDateYmd(payment.createdAt),
  }));
}

export function buildLedgerRowsFromFolioCharges(
  charges: readonly LedgerFolioCharge[],
): LedgerRow[] {
  return charges.map((charge) => ({
    id: charge.id,
    kind: "folio_charge" as const,
    reservationId: charge.reservationId,
    description: charge.label,
    channel: charge.channel ?? "cash",
    status: charge.status ?? "success",
    amountNgn: koboToNgn(charge.amountKobo),
    createdAt: charge.createdAt,
    dateYmd: toDateYmd(charge.createdAt),
  }));
}

/**
 * Builds combined ledger rows from activity payments, plus optional folio
 * charges when a caller passes that array in. Sorted newest first.
 */
export function buildLedgerRows(
  payments: readonly LedgerPaymentInput[],
  folioCharges?: readonly LedgerFolioCharge[],
): LedgerRow[] {
  const rows = [
    ...buildLedgerRowsFromPayments(payments),
    ...(folioCharges ? buildLedgerRowsFromFolioCharges(folioCharges) : []),
  ];
  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function filterLedgerRowsByDateRange(
  rows: readonly LedgerRow[],
  range: LedgerDateRange,
): LedgerRow[] {
  const { from, to } = range;
  if (!from && !to) return [...rows];
  return rows.filter((row) => {
    if (from && row.dateYmd < from) return false;
    if (to && row.dateYmd > to) return false;
    return true;
  });
}

export function filterSuccessfulLedgerRows(
  rows: readonly LedgerRow[],
): LedgerRow[] {
  return rows.filter((row) => row.status === "success");
}

/** Cash / Paystack / Moniepoint / total breakdown, all amounts in NGN. */
export function summarizeLedgerByChannel(
  rows: readonly LedgerRow[],
): LedgerChannelSummary {
  const summary: LedgerChannelSummary = {
    cash: 0,
    paystack: 0,
    moniepoint: 0,
    totalNgn: 0,
    count: rows.length,
  };
  for (const row of rows) {
    summary[row.channel] += row.amountNgn;
    summary.totalNgn += row.amountNgn;
  }
  return summary;
}

/** Finer-grained breakdown keyed by the raw payment method (falls back to channel). */
export function summarizeLedgerByPaymentMethod(
  rows: readonly LedgerRow[],
): Record<string, LedgerMethodSummaryEntry> {
  const summary: Record<string, LedgerMethodSummaryEntry> = {};
  for (const row of rows) {
    const key = row.paymentMethod ?? row.channel;
    const entry = summary[key] ?? { amountNgn: 0, count: 0 };
    entry.amountNgn += row.amountNgn;
    entry.count += 1;
    summary[key] = entry;
  }
  return summary;
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const CSV_HEADER = [
  "Date",
  "Reference",
  "Description",
  "Channel",
  "Payment Method",
  "Status",
  "Amount (NGN)",
];

export function ledgerRowsToCsv(rows: readonly LedgerRow[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.dateYmd,
        row.reference ?? "",
        row.description,
        row.channel,
        row.paymentMethod ?? "",
        row.status,
        row.amountNgn.toFixed(2),
      ]
        .map((value) => escapeCsvValue(String(value)))
        .join(","),
    );
  }
  return lines.join("\n");
}
