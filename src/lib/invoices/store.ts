/**
 * Issued invoices and credit notes. Append-only: a document is never edited
 * or deleted once issued (enforced by a trigger in Supabase); a credit note
 * is the only way to reverse an invoice. Numbers come from a per-series,
 * per-year counter taken atomically (next_document_number() in Supabase, the
 * JSON store's per-file lock in file mode).
 */

import { dataPath } from "@/lib/data-dir";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";
import { randomUUID } from "crypto";
import type { InvoiceDocument, InvoiceKind } from "./build";

export type IssuedInvoice = {
  id: string;
  number: string;
  kind: InvoiceKind;
  reservationId: string;
  issuedAt: string;
  dueAt: string;
  totalNgn: number;
  creditForId?: string;
  document: InvoiceDocument;
};

type Store = { counters: Record<string, number>; invoices: IssuedInvoice[] };

const STORE_FILE = dataPath("invoices.json");
const empty = (): Store => ({ counters: {}, invoices: [] });

type InvoiceRow = {
  id: string;
  number: string;
  kind: InvoiceKind;
  reservation_id: string;
  issued_at: string;
  due_at: string;
  total_ngn: number;
  credit_for: string | null;
  document: InvoiceDocument;
};

function mapRow(row: InvoiceRow): IssuedInvoice {
  return {
    id: row.id,
    number: row.number,
    kind: row.kind,
    reservationId: row.reservation_id,
    issuedAt: row.issued_at,
    dueAt: row.due_at,
    totalNgn: row.total_ngn,
    creditForId: row.credit_for ?? undefined,
    document: row.document,
  };
}

export type NewInvoice = {
  kind: InvoiceKind;
  reservationId: string;
  dueAt: string;
  creditForId?: string;
  document: InvoiceDocument;
  /** Builds the number from the counter value; called inside the lock. */
  formatNumber: (counter: number) => string;
  /** Counter series, e.g. "invoice:2026" (yearly reset) or "invoice". */
  series: string;
};

export async function issueInvoice(input: NewInvoice): Promise<IssuedInvoice> {
  const issuedAt = new Date().toISOString();

  if (!isSupabaseEnabled()) {
    return updateJsonFile(STORE_FILE, empty, (store) => {
      if (input.creditForId && store.invoices.some((i) => i.creditForId === input.creditForId)) {
        throw new InvoiceStoreError("This invoice already has a credit note", 409);
      }
      const counter = (store.counters[input.series] ?? 0) + 1;
      store.counters[input.series] = counter;
      const record: IssuedInvoice = {
        id: randomUUID(),
        number: input.formatNumber(counter),
        kind: input.kind,
        reservationId: input.reservationId,
        issuedAt,
        dueAt: input.dueAt,
        totalNgn: input.document.totals.grossNgn,
        creditForId: input.creditForId,
        document: input.document,
      };
      store.invoices.unshift(record);
      return record;
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { data: counter, error: counterError } = await supabase.rpc("next_document_number", {
    p_series: input.series,
  });
  if (counterError) throw new Error(counterError.message);

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      number: input.formatNumber(counter as number),
      kind: input.kind,
      reservation_id: input.reservationId,
      issued_at: issuedAt,
      due_at: input.dueAt,
      total_ngn: input.document.totals.grossNgn,
      credit_for: input.creditForId ?? null,
      document: input.document,
    })
    .select()
    .single();
  if (error) {
    // unique(credit_for) — the invoice was already credited.
    if (error.code === "23505" && input.creditForId) {
      throw new InvoiceStoreError("This invoice already has a credit note", 409);
    }
    throw new Error(error.message);
  }
  return mapRow(data as InvoiceRow);
}

export async function listInvoicesForReservation(reservationId: string): Promise<IssuedInvoice[]> {
  if (!isSupabaseEnabled()) {
    const store = await readJsonFile(STORE_FILE, empty);
    return store.invoices.filter((i) => i.reservationId === reservationId);
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("invoices")
    .select()
    .eq("reservation_id", reservationId)
    .order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as InvoiceRow[]).map(mapRow);
}

export async function findInvoiceById(id: string): Promise<IssuedInvoice | undefined> {
  if (!isSupabaseEnabled()) {
    const store = await readJsonFile(STORE_FILE, empty);
    return store.invoices.find((i) => i.id === id);
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("invoices").select().eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as InvoiceRow) : undefined;
}

export class InvoiceStoreError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Invoices and credit notes issued on days [from, to]. */
export async function listInvoicesInRange(from: string, to: string): Promise<IssuedInvoice[]> {
  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const endIso = end.toISOString();
  if (!isSupabaseEnabled()) {
    const store = await readJsonFile(STORE_FILE, empty);
    return store.invoices.filter((i) => i.issuedAt >= from && i.issuedAt < endIso);
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("invoices")
    .select()
    .gte("issued_at", from)
    .lt("issued_at", endIso)
    .order("issued_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as InvoiceRow[]).map(mapRow);
}
