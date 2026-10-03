import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildJournal, DEFAULT_LEDGER_ACCOUNTS, journalToCsv, unbalancedEntries } from "@/lib/accounting/journal";
import type { PaymentRecord } from "@/lib/demo-store";
import type { InvoiceLine } from "@/lib/invoices/build";
import type { IssuedInvoice } from "@/lib/invoices/store";

const line = (kind: InvoiceLine["kind"], amountNgn: number, vatNgn: number): InvoiceLine => ({
  kind, description: kind, quantity: 1, unitPriceNgn: amountNgn, amountNgn, vatPct: 7.5, vatNgn,
});

function invoice(number: string, kind: IssuedInvoice["kind"], lines: InvoiceLine[]): IssuedInvoice {
  const grossNgn = lines.reduce((s, l) => s + l.amountNgn, 0);
  const vatNgn = lines.reduce((s, l) => s + l.vatNgn, 0);
  return {
    id: number, number, kind, reservationId: "res-1", issuedAt: "2026-11-02T10:00:00Z", dueAt: "2026-11-09T10:00:00Z", totalNgn: grossNgn,
    document: {
      kind, reservation: { id: "res-1", roomLabel: "Guest Room", roomNumbers: [], rooms: 1, guests: 2 },
      guest: { name: "Ada Obi", email: "ada@example.com" }, payee: { name: "Relief", address: "", taxId: "", bankDetails: "" },
      lines, payments: [], totals: { netNgn: grossNgn - vatNgn, vatNgn, grossNgn, paidNgn: 0, balanceNgn: grossNgn }, paymentTermsDays: 7, footer: "",
    },
  };
}

const payment = (reference: string, amountKobo: number, paymentMethod?: PaymentRecord["paymentMethod"]): PaymentRecord => ({
  id: reference, reference, reservationId: "res-1", email: "ada@example.com", amountKobo, currency: "NGN", status: "success",
  itemType: "room", itemId: "guest-room", itemLabel: "Guest Room", paymentMethod, source: "demo", createdAt: "2026-11-03T09:00:00Z",
});

describe("accounting journal", () => {
  const invoices = [
    invoice("INV-1", "invoice", [line("room", 215_000, 15_000), line("discount", -10_750, -750), line("extra", 10_750, 750), line("folio", 5_375, 375)]),
    invoice("CN-1", "credit_note", [line("room", -107_500, -7_500)]),
  ];
  const payments = [payment("PAY-1", 10_000_000, "cash"), payment("PAY-2", 5_000_000), payment("REF-1", -2_000_000, "moniepoint_transfer")];
  const lines = buildJournal({ invoices, payments, accounts: DEFAULT_LEDGER_ACCOUNTS });

  it("balances every entry", () => {
    assert.deepEqual(unbalancedEntries(lines), []);
  });

  it("posts invoice revenue net of VAT by bucket", () => {
    const inv = lines.filter((l) => l.entry === "INV-1");
    const get = (account: string) => inv.find((l) => l.account === account);
    assert.equal(get("accountsReceivable")?.debitNgn, 220_375);
    assert.equal(get("roomRevenue")?.creditNgn, 190_000);
    assert.equal(get("extrasRevenue")?.creditNgn, 10_000);
    assert.equal(get("fnbRevenue")?.creditNgn, 5_000);
    assert.equal(get("vatPayable")?.creditNgn, 15_375);
    assert.equal(get("roomRevenue")?.code, "4000");
  });

  it("flips sides for credit notes and refunds", () => {
    const cn = lines.filter((l) => l.entry === "CN-1");
    assert.equal(cn.find((l) => l.account === "accountsReceivable")?.creditNgn, 107_500);
    assert.equal(cn.find((l) => l.account === "roomRevenue")?.debitNgn, 100_000);
    const refund = lines.filter((l) => l.entry === "REF-1");
    assert.deepEqual(refund.map((l) => [l.account, l.debitNgn, l.creditNgn]), [["bankTransfer", 0, 20_000], ["accountsReceivable", 20_000, 0]]);
  });

  it("routes payments to their method account", () => {
    assert.equal(lines.find((l) => l.entry === "PAY-1" && l.debitNgn > 0)?.account, "cash");
    assert.equal(lines.find((l) => l.entry === "PAY-2" && l.debitNgn > 0)?.account, "paystackOnline");
  });

  it("exports CSV with a header and escaped text", () => {
    const csv = journalToCsv(lines);
    const rows = csv.trim().split("\n");
    assert.match(rows[0], /^Date,Entry,Booking,Account code/);
    assert.equal(rows.length, lines.length + 1);
    assert.ok(csv.includes("Invoice INV-1 — Ada Obi"));
  });
});
