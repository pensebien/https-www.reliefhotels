import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteStay } from "@/lib/booking-engine/quote";
import { DEFAULT_RATE_CONFIG, type RateConfig } from "@/lib/booking-engine/rate-config";
import { buildCreditNote, buildInvoiceDocument } from "@/lib/invoices/build";
import { DEFAULT_INVOICE_SETTINGS, formatDocumentNumber } from "@/lib/invoices/settings";
import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";
import type { FolioCharge } from "@/lib/folio/types";

const config: RateConfig = {
  ...DEFAULT_RATE_CONFIG,
  rooms: DEFAULT_RATE_CONFIG.rooms.map((r) => (r.roomId === "guest-room" ? { ...r, weekendUpliftNgn: 15_000 } : r)),
  coupons: [{ code: "TEN", pct: 10, active: true }],
  extras: [{ id: "breakfast", label: "Breakfast", priceNgn: 8_000, pricing: "per_guest_night", active: true }],
};

// Thu 2026-10-08 → Sun 2026-10-11: Thu 95k, Fri 110k, Sat 110k.
const quote = quoteStay(
  { roomId: "guest-room", checkIn: "2026-10-08", checkOut: "2026-10-11", guests: 2, couponCode: "TEN", extraIds: ["breakfast"] },
  config,
);
assert.ok(quote.ok);

const reservation: ReservationRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  firstName: "Ada", lastName: "Obi", email: "ada@example.com", itemType: "room", roomId: "guest-room",
  checkIn: "2026-10-08", checkOut: "2026-10-11", nights: 3, guests: 2, stayPreference: "x", message: "x",
  status: "confirmed", source: "live", createdAt: "2026-10-01T00:00:00Z", emailSent: true,
  quotedTotalNgn: quote.totalNgn, quotedDepositNgn: quote.depositNgn, quoteSnapshot: quote,
};

const folio: FolioCharge[] = [
  { id: "f1", reservationId: reservation.id, sku: "wine", name: "Red wine", qty: 2, unitPriceNgn: 10_000, status: "posted", createdAt: "2026-10-09T20:00:00Z" },
  { id: "f2", reservationId: reservation.id, sku: "water", name: "Water", qty: 1, unitPriceNgn: 1_000, status: "paid", createdAt: "2026-10-09T21:00:00Z" },
  { id: "f3", reservationId: reservation.id, sku: "x", name: "Mistake", qty: 1, unitPriceNgn: 50_000, status: "void", createdAt: "2026-10-09T22:00:00Z" },
];

const deposit: PaymentRecord = {
  id: "p1", reference: "RH-1", reservationId: reservation.id, email: reservation.email, amountKobo: quote.depositNgn * 100,
  currency: "NGN", status: "success", itemType: "room", itemId: "guest-room", itemLabel: "deposit",
  paymentMethod: "paystack", source: "live", createdAt: "2026-10-01T00:05:00Z",
};

const build = (over: Partial<Parameters<typeof buildInvoiceDocument>[0]> = {}) =>
  buildInvoiceDocument({
    reservation,
    roomLabel: "Standard",
    roomNumbers: ["103"],
    catalogNightlyNgn: 95_000,
    folioCharges: folio,
    payments: [deposit, { ...deposit, id: "p2", reference: "RH-2", status: "failed" }],
    tax: { vatPercentage: 7.5, collectionMode: "pass_through" },
    settings: DEFAULT_INVOICE_SETTINGS,
    ...over,
  });

describe("invoice builder", () => {
  it("itemises nights by rate, discounts, extras and folio, and totals match the quote", () => {
    const doc = build();
    const descriptions = doc.lines.map((l) => l.description);
    assert.match(descriptions[0], /1 night from 2026-10-08 at ₦95,000/);
    assert.match(descriptions[1], /2 nights from 2026-10-09 at ₦110,000/);
    assert.ok(descriptions.includes("Promo code TEN"));
    assert.ok(descriptions.includes("Breakfast"));
    assert.ok(!descriptions.includes("Mistake"), "void folio charges are left out");

    const roomAndExtras = doc.lines.filter((l) => l.kind !== "folio").reduce((s, l) => s + l.amountNgn, 0);
    assert.equal(roomAndExtras, quote.totalNgn);

    // Folio VAT added on top (pass_through 7.5%): wine 20,000 + 1,500; water 1,000 + 75.
    const folioTotal = doc.lines.filter((l) => l.kind === "folio").reduce((s, l) => s + l.amountNgn, 0);
    assert.equal(folioTotal, 21_500 + 1_075);
    assert.equal(doc.totals.vatNgn, 1_500 + 75);

    // Paid: deposit + water paid at the outlet; the failed payment is ignored.
    assert.equal(doc.totals.paidNgn, quote.depositNgn + 1_075);
    assert.equal(doc.totals.balanceNgn, doc.totals.grossNgn - doc.totals.paidNgn);
    assert.equal(doc.totals.netNgn + doc.totals.vatNgn, doc.totals.grossNgn);
  });

  it("backs VAT out of room prices without changing what the guest pays", () => {
    const doc = build({ settings: { ...DEFAULT_INVOICE_SETTINGS, roomVatPct: 7.5 }, folioCharges: [] });
    const first = doc.lines[0];
    assert.equal(first.amountNgn, 95_000);
    assert.equal(first.vatNgn, Math.round((95_000 * 7.5) / 107.5));
    assert.equal(doc.totals.grossNgn, quote.totalNgn);
  });

  it("falls back to one line at the locked total for bookings without a stored quote", () => {
    const doc = build({ reservation: { ...reservation, quoteSnapshot: undefined }, folioCharges: [] });
    assert.equal(doc.lines.length, 1);
    assert.equal(doc.lines[0].amountNgn, quote.totalNgn);
  });

  it("credit notes negate every line and owe nothing back to themselves", () => {
    const doc = build();
    const credit = buildCreditNote(doc, { id: "inv-1", number: "RH-2026-00001" }, "Guest cancelled");
    assert.equal(credit.kind, "credit_note");
    assert.equal(credit.totals.grossNgn, -doc.totals.grossNgn);
    assert.ok(credit.lines.every((l, i) => l.amountNgn === -doc.lines[i].amountNgn));
    assert.deepEqual(credit.payments, []);
    assert.equal(credit.creditFor?.number, "RH-2026-00001");
  });

  it("formats numbers with year and padding", () => {
    assert.equal(formatDocumentNumber("RH-{year}-{id}", 7, 5, 2026), "RH-2026-00007");
    assert.equal(formatDocumentNumber("INV{id}", 123, 0, 2026), "INV123");
  });
});
