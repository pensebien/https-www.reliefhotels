import { rooms } from "@/content/site";
import {
  findReservationById,
  listGroupMembers,
  listPaymentsForReservation,
  type ReservationRecord,
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
  const found = await findReservationById(reservationId);
  if (!found) return { ok: false, status: 404, error: "Reservation not found" };
  // A group booking gets one invoice on its lead line covering every room type.
  const members = (await listGroupMembers(found)).filter((m) => m.status !== "cancelled" || m.id === found.id);
  const reservation = members[0] ?? found;
  if (reservation.itemType !== "room") {
    return { ok: false, status: 422, error: "Invoices are for room bookings" };
  }

  const [settings, tax, folioLists, paymentLists, roomSetup] = await Promise.all([
    getInvoiceSettings(),
    getTaxSettings(),
    Promise.all(members.map((m) => listFolioCharges(m.id))),
    Promise.all(members.map((m) => listPaymentsForReservation(m.id))),
    getRoomSetup(),
  ]);
  const labels = unitLabelMap(roomSetup);
  const stay = (m: ReservationRecord) => ({
    reservation: m,
    roomLabel: roomDisplayName(m.roomId),
    roomNumbers: (m.assignedUnits ?? []).map((u) => labels[u] ?? u),
    catalogNightlyNgn: rooms.find((r) => r.id === m.roomId)?.priceFrom ?? 0,
  });
  const lead = stay(reservation);
  const document = buildInvoiceDocument({
    ...lead,
    otherStays: members.slice(1).map(stay),
    folioCharges: folioLists.flat(),
    payments: paymentLists.flat(),
    tax,
    settings,
  });

  const year = new Date().getFullYear();
  const invoice = await issueInvoice({
    kind: "invoice",
    reservationId: reservation.id,
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
