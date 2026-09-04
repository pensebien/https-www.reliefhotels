import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLedgerRows,
  filterLedgerRowsByDateRange,
  filterSuccessfulLedgerRows,
  ledgerRowsToCsv,
  resolveLedgerChannel,
  summarizeLedgerByChannel,
  summarizeLedgerByPaymentMethod,
  type LedgerFolioCharge,
  type LedgerPaymentInput,
} from "@/lib/accounting/ledger";

const onlinePayment: LedgerPaymentInput = {
  id: "pay-1",
  reference: "RH-PAY-001",
  reservationId: "res-1",
  email: "ada@example.com",
  amountKobo: 5_000_000, // 50,000 NGN
  status: "success",
  itemType: "room",
  itemLabel: "guest-room — 2 night(s) deposit",
  source: "demo",
  createdAt: "2026-06-01T09:00:00.000Z",
};

const cashSettlement: LedgerPaymentInput = {
  id: "pay-2",
  reference: "RH-CASH-001",
  reservationId: "res-2",
  email: "chidi@example.com",
  amountKobo: 3_000_000, // 30,000 NGN
  status: "success",
  paymentMethod: "cash",
  paymentChannel: "cash",
  itemType: "room",
  itemLabel: "executive-room — cash settle",
  source: "live",
  createdAt: "2026-06-02T10:00:00.000Z",
};

const moniepointSettlement: LedgerPaymentInput = {
  id: "pay-3",
  reference: "RH-MPT-001",
  reservationId: "res-3",
  email: "fatima@example.com",
  amountKobo: 2_000_000, // 20,000 NGN
  status: "success",
  paymentMethod: "moniepoint_terminal",
  paymentChannel: "moniepoint",
  itemType: "room",
  itemLabel: "signature-suite — Moniepoint terminal settle",
  source: "live",
  createdAt: "2026-06-03T11:00:00.000Z",
};

const failedPayment: LedgerPaymentInput = {
  id: "pay-4",
  reference: "RH-PAY-004",
  reservationId: "res-4",
  email: "james@example.com",
  amountKobo: 1_000_000,
  status: "failed",
  itemType: "room",
  itemLabel: "guest-room — deposit attempt",
  source: "demo",
  createdAt: "2026-06-04T12:00:00.000Z",
};

const folioCharge: LedgerFolioCharge = {
  id: "folio-1",
  reservationId: "res-1",
  label: "Room service — club sandwich",
  amountKobo: 450_000, // 4,500 NGN
  channel: "cash",
  createdAt: "2026-06-05T13:00:00.000Z",
};

describe("resolveLedgerChannel", () => {
  it("uses the explicit paymentChannel when present", () => {
    assert.equal(
      resolveLedgerChannel({ paymentChannel: "moniepoint", paymentMethod: "cash" }),
      "moniepoint",
    );
  });

  it("derives moniepoint from front-desk payment methods", () => {
    assert.equal(resolveLedgerChannel({ paymentMethod: "moniepoint_transfer" }), "moniepoint");
    assert.equal(resolveLedgerChannel({ paymentMethod: "moniepoint_terminal" }), "moniepoint");
  });

  it("derives cash from the cash payment method", () => {
    assert.equal(resolveLedgerChannel({ paymentMethod: "cash" }), "cash");
  });

  it("defaults to paystack for unset or paystack methods (online checkout)", () => {
    assert.equal(resolveLedgerChannel({}), "paystack");
    assert.equal(resolveLedgerChannel({ paymentMethod: "paystack_terminal" }), "paystack");
  });

  it("derives bank_transfer_manual as its own channel, not paystack or moniepoint", () => {
    assert.equal(
      resolveLedgerChannel({ paymentMethod: "bank_transfer_manual" }),
      "bank_transfer_manual",
    );
  });
});

describe("buildLedgerRows", () => {
  it("builds rows from payments only when no folio charges are passed", () => {
    const rows = buildLedgerRows([onlinePayment, cashSettlement]);
    assert.equal(rows.length, 2);
    assert.equal(rows.every((row) => row.kind === "payment"), true);
  });

  it("includes folio charges when an array is passed", () => {
    const rows = buildLedgerRows([onlinePayment], [folioCharge]);
    assert.equal(rows.length, 2);
    assert.equal(rows.some((row) => row.kind === "folio_charge"), true);
  });

  it("sorts rows newest first", () => {
    const rows = buildLedgerRows([onlinePayment, cashSettlement, moniepointSettlement]);
    assert.deepEqual(
      rows.map((r) => r.id),
      ["pay-3", "pay-2", "pay-1"],
    );
  });

  it("converts kobo to NGN", () => {
    const [row] = buildLedgerRows([onlinePayment]);
    assert.equal(row.amountNgn, 50_000);
  });
});

describe("filterLedgerRowsByDateRange", () => {
  const rows = buildLedgerRows([
    onlinePayment,
    cashSettlement,
    moniepointSettlement,
    failedPayment,
  ]);

  it("returns all rows when no range is given", () => {
    assert.equal(filterLedgerRowsByDateRange(rows, {}).length, rows.length);
  });

  it("filters by inclusive lower bound", () => {
    const filtered = filterLedgerRowsByDateRange(rows, { from: "2026-06-03" });
    assert.equal(filtered.length, 2);
    assert.equal(
      filtered.every((r) => r.dateYmd >= "2026-06-03"),
      true,
    );
  });

  it("filters by inclusive upper bound", () => {
    const filtered = filterLedgerRowsByDateRange(rows, { to: "2026-06-02" });
    assert.equal(filtered.length, 2);
  });

  it("filters by an inclusive range", () => {
    const filtered = filterLedgerRowsByDateRange(rows, {
      from: "2026-06-02",
      to: "2026-06-03",
    });
    assert.deepEqual(
      filtered.map((r) => r.id).sort(),
      ["pay-2", "pay-3"],
    );
  });
});

describe("filterSuccessfulLedgerRows", () => {
  it("excludes non-success rows", () => {
    const rows = buildLedgerRows([onlinePayment, failedPayment]);
    const successful = filterSuccessfulLedgerRows(rows);
    assert.equal(successful.length, 1);
    assert.equal(successful[0]?.id, "pay-1");
  });
});

describe("summarizeLedgerByChannel", () => {
  it("buckets amounts by cash / paystack / moniepoint and totals them", () => {
    const rows = buildLedgerRows([onlinePayment, cashSettlement, moniepointSettlement]);
    const summary = summarizeLedgerByChannel(rows);

    assert.equal(summary.paystack, 50_000);
    assert.equal(summary.cash, 30_000);
    assert.equal(summary.moniepoint, 20_000);
    assert.equal(summary.totalNgn, 100_000);
    assert.equal(summary.count, 3);
  });

  it("returns zeroed totals for an empty row set", () => {
    const summary = summarizeLedgerByChannel([]);
    assert.deepEqual(summary, {
      cash: 0,
      paystack: 0,
      moniepoint: 0,
      bank_transfer_manual: 0,
      totalNgn: 0,
      count: 0,
    });
  });
});

describe("summarizeLedgerByPaymentMethod", () => {
  it("groups by the raw payment method, falling back to channel when unset", () => {
    const rows = buildLedgerRows([onlinePayment, cashSettlement, moniepointSettlement]);
    const summary = summarizeLedgerByPaymentMethod(rows);

    assert.equal(summary.paystack?.amountNgn, 50_000);
    assert.equal(summary.cash?.amountNgn, 30_000);
    assert.equal(summary.moniepoint_terminal?.amountNgn, 20_000);
    assert.equal(summary.cash?.count, 1);
  });
});

describe("ledgerRowsToCsv", () => {
  it("produces a header row plus one row per ledger entry", () => {
    const rows = buildLedgerRows([onlinePayment, cashSettlement]);
    const csv = ledgerRowsToCsv(rows);
    const lines = csv.split("\n");

    assert.equal(lines.length, 3);
    assert.equal(lines[0], "Date,Reference,Description,Channel,Payment Method,Status,Amount (NGN)");
    assert.equal(lines[1]?.includes("RH-CASH-001"), true);
    assert.equal(lines[2]?.includes("RH-PAY-001"), true);
  });

  it("returns just the header for an empty row set", () => {
    assert.equal(
      ledgerRowsToCsv([]),
      "Date,Reference,Description,Channel,Payment Method,Status,Amount (NGN)",
    );
  });
});
