import { rooms } from "@/content/site";
import {
  findReservationById,
  listPaymentsForReservation,
} from "@/lib/demo-store";
import { listFolioCharges } from "@/lib/folio/store";
import { roomDisplayName } from "@/lib/room-names";
import { getRoomSetup, unitLabelMap } from "@/lib/room-setup";
import { getTaxSettings } from "@/lib/tax-settings";
import { buildCreditNote, buildInvoiceDocument } from "./build";
import { formatDocumentNumber, getInvoiceSettings, type InvoiceSettings } from "./settings";
import {
  findInvoiceById,
  issueInvoice,
  type IssuedInvoice,
} from "./store";

export type IssueResult =
  | { ok: true; invoice: IssuedInvoice }
  | { ok: false; status: 404 | 409 | 422; error: string };

function series(kind: "invoice" | "credit_note", settings: InvoiceSettings, year: number): string {
  return settings.resetYearly ? `${kind}:${year}` : kind;
}

function dueDate(settings: InvoiceSettings, issued = new Date()): string {
  return new Date(issued.getTime() + settings.paymentTermsDays * 86_400_000).toISOString();
}

/** Issue an invoice for a room booking as it stands now: stay, extras, folio, payments. */
export async function issueInvoiceForReservation(reservationId: string): Promise<IssueResult> {
  const reservation = await findReservationById(reservationId);
  if (!reservation) return { ok: false, status: 404, error: "Reservation not found" };
  if (reservation.itemType !== "room") {
    return { ok: false, status: 422, error: "Invoices are for room bookings" };
  }

  const [settings, tax, folioCharges, payments, roomSetup] = await Promise.all([
    getInvoiceSettings(),
    getTaxSettings(),
    listFolioCharges(reservationId),
    listPaymentsForReservation(reservationId),
    getRoomSetup(),
  ]);
  const labels = unitLabelMap(roomSetup);
  const document = buildInvoiceDocument({
    reservation,
    roomLabel: roomDisplayName(reservation.roomId),
    roomNumbers: (reservation.assignedUnits ?? []).map((u) => labels[u] ?? u),
    catalogNightlyNgn: rooms.find((r) => r.id === reservation.roomId)?.priceFrom ?? 0,
    folioCharges,
    payments,
    tax,
    settings,
  });

  const year = new Date().getFullYear();
  const invoice = await issueInvoice({
    kind: "invoice",
    reservationId,
    dueAt: dueDate(settings),
    document,
    series: series("invoice", settings, year),
    formatNumber: (n) => formatDocumentNumber(settings.invoiceFormat, n, settings.padding, year),
  });
  return { ok: true, invoice };
}

/** Reverse an invoice in full. Each invoice can be credited once. */
export async function issueCreditNoteFor(invoiceId: string, reason: string): Promise<IssueResult> {
  const original = await findInvoiceById(invoiceId);
  if (!original) return { ok: false, status: 404, error: "Invoice not found" };
  if (original.kind !== "invoice") {
    return { ok: false, status: 422, error: "Only invoices can be credited" };
  }

  const settings = await getInvoiceSettings();
  const year = new Date().getFullYear();
  const document = buildCreditNote(original.document, { id: original.id, number: original.number }, reason);
  const invoice = await issueInvoice({
    kind: "credit_note",
    reservationId: original.reservationId,
    dueAt: new Date().toISOString(),
    creditForId: original.id,
    document,
    series: series("credit_note", settings, year),
    formatNumber: (n) => formatDocumentNumber(settings.creditNoteFormat, n, settings.padding, year),
  });
  return { ok: true, invoice };
}
