/**
 * Double-entry journal for the accountant (Sirvoy "Chart of accounts"):
 * invoices recognise revenue and VAT against accounts receivable; payments
 * and refunds move money between receivable and the account it arrived in.
 * Payments taken before the invoice leave receivable in credit (a guest
 * deposit) until the invoice is issued.
 */

import type { IssuedInvoice } from "@/lib/invoices/store";
import type { PaymentRecord } from "@/lib/demo-store";
import { readSettingsDoc, writeSettingsDoc } from "@/lib/settings-store";
import { z } from "zod";

const code = z.string().trim().min(1).max(20);
export const ledgerAccountsSchema = z.object({
  accountsReceivable: code,
  roomRevenue: code,
  extrasRevenue: code,
  fnbRevenue: code,
  vatPayable: code,
  cash: code,
  bankTransfer: code,
  paystackOnline: code,
  cardMoniepoint: code,
  cardPaystackPos: code,
});
export type LedgerAccounts = z.infer<typeof ledgerAccountsSchema>;

export const DEFAULT_LEDGER_ACCOUNTS: LedgerAccounts = {
  accountsReceivable: "1200",
  roomRevenue: "4000",
  extrasRevenue: "4010",
  fnbRevenue: "4100",
  vatPayable: "2200",
  cash: "1000",
  bankTransfer: "1010",
  paystackOnline: "1020",
  cardMoniepoint: "1030",
  cardPaystackPos: "1040",
};

export const ACCOUNT_NAMES: Record<keyof LedgerAccounts, string> = {
  accountsReceivable: "Accounts receivable (guests)",
  roomRevenue: "Room revenue",
  extrasRevenue: "Extras revenue",
  fnbRevenue: "Food & beverage revenue",
  vatPayable: "VAT payable",
  cash: "Cash",
  bankTransfer: "Bank transfer",
  paystackOnline: "Paystack (online)",
  cardMoniepoint: "Card — Moniepoint POS",
  cardPaystackPos: "Card — Paystack POS",
};

const KEY = "ledger_accounts";
export function getLedgerAccounts(): Promise<LedgerAccounts> {
  return readSettingsDoc(KEY, (raw) => {
    const parsed = ledgerAccountsSchema.safeParse({ ...DEFAULT_LEDGER_ACCOUNTS, ...(raw && typeof raw === "object" ? raw : {}) });
    return parsed.success ? parsed.data : DEFAULT_LEDGER_ACCOUNTS;
  });
}
export async function saveLedgerAccounts(input: unknown): Promise<LedgerAccounts> {
  const parsed = ledgerAccountsSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  return writeSettingsDoc(KEY, parsed.data);
}

export type JournalLine = {
  date: string;
  entry: string;
  reference: string;
  account: keyof LedgerAccounts;
  code: string;
  description: string;
  debitNgn: number;
  creditNgn: number;
};

function paymentAccount(p: PaymentRecord): keyof LedgerAccounts {
  switch (p.paymentMethod) {
    case "cash":
      return "cash";
    case "moniepoint_transfer":
      return "bankTransfer";
    case "moniepoint_terminal":
      return "cardMoniepoint";
    case "paystack_terminal":
      return "cardPaystackPos";
    default:
      return "paystackOnline";
  }
}

export function buildJournal(input: {
  invoices: IssuedInvoice[];
  payments: PaymentRecord[];
  accounts: LedgerAccounts;
}): JournalLine[] {
  const lines: JournalLine[] = [];
  const push = (l: Omit<JournalLine, "code">) => {
    if (l.debitNgn === 0 && l.creditNgn === 0) return;
    lines.push({ ...l, code: input.accounts[l.account] });
  };
  /** Positive amounts go to their natural side; negatives flip (credit notes, refunds). */
  const side = (amount: number, natural: "debit" | "credit") =>
    (amount >= 0) === (natural === "debit")
      ? { debitNgn: Math.abs(amount), creditNgn: 0 }
      : { debitNgn: 0, creditNgn: Math.abs(amount) };

  for (const inv of input.invoices) {
    const doc = inv.document;
    const date = inv.issuedAt.slice(0, 10);
    const base = { date, entry: inv.number, reference: inv.reservationId };
    const net = { room: 0, extra: 0, folio: 0 };
    for (const line of doc.lines) {
      const bucket = line.kind === "folio" ? "folio" : line.kind === "extra" ? "extra" : "room";
      net[bucket] += line.amountNgn - line.vatNgn;
    }
    const label = inv.kind === "credit_note" ? "Credit note" : "Invoice";
    push({ ...base, account: "accountsReceivable", description: `${label} ${inv.number} — ${doc.guest.name}`, ...side(doc.totals.grossNgn, "debit") });
    push({ ...base, account: "roomRevenue", description: `${label} ${inv.number} rooms`, ...side(net.room, "credit") });
    push({ ...base, account: "extrasRevenue", description: `${label} ${inv.number} extras`, ...side(net.extra, "credit") });
    push({ ...base, account: "fnbRevenue", description: `${label} ${inv.number} food & beverage`, ...side(net.folio, "credit") });
    push({ ...base, account: "vatPayable", description: `${label} ${inv.number} VAT`, ...side(doc.totals.vatNgn, "credit") });
  }

  for (const p of input.payments) {
    if (p.status !== "success") continue;
    const amount = Math.round(p.amountKobo / 100);
    const base = { date: p.createdAt.slice(0, 10), entry: p.reference, reference: p.reservationId ?? "" };
    const what = amount < 0 ? "Refund" : "Payment";
    push({ ...base, account: paymentAccount(p), description: `${what} ${p.reference}`, ...side(amount, "debit") });
    push({ ...base, account: "accountsReceivable", description: `${what} ${p.reference}`, ...side(amount, "credit") });
  }
  return lines.sort((a, b) => a.date.localeCompare(b.date) || a.entry.localeCompare(b.entry));
}

/** Every entry must balance; returns the entries that don't (should be none). */
export function unbalancedEntries(lines: JournalLine[]): string[] {
  const totals = new Map<string, number>();
  for (const l of lines) totals.set(l.entry, (totals.get(l.entry) ?? 0) + l.debitNgn - l.creditNgn);
  return [...totals.entries()].filter(([, v]) => Math.abs(v) > 0).map(([k]) => k);
}

export function journalToCsv(lines: JournalLine[]): string {
  const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const rows = [
    ["Date", "Entry", "Booking", "Account code", "Account", "Description", "Debit (NGN)", "Credit (NGN)"],
    ...lines.map((l) => [l.date, l.entry, l.reference, l.code, ACCOUNT_NAMES[l.account], l.description, l.debitNgn || "", l.creditNgn || ""]),
  ];
  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}
