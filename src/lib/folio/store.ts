/**
 * Folio (minibar / F&B) charge store — Agent K.
 *
 * File-backed by default (`data/folio-charges.json`, mirrors the pattern in
 * `src/lib/db/inventory-store.ts`), with an optional Supabase-backed path
 * (see `docs/supabase/migration-009-folio.sql`) that activates automatically
 * once `isSupabaseEnabled()` is true — same dual-mode contract as the rest
 * of this codebase's demo/file vs. production/Supabase split.
 */

import { findFnbCatalogItem } from "@/content/fnb-catalog";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import {
  isTerminalFolioStatus,
  type FolioCharge,
  type FolioChargeStatus,
} from "@/lib/folio/types";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export class FolioStoreError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FolioStoreError";
    this.status = status;
  }
}

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(STORE_DIR, "folio-charges.json");

type FolioFile = { charges: FolioCharge[] };

async function readFile(): Promise<FolioFile> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    return JSON.parse(raw) as FolioFile;
  } catch {
    const initial: FolioFile = { charges: [] };
    await writeFile(initial);
    return initial;
  }
}

async function writeFile(data: FolioFile): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function mapRow(row: Record<string, unknown>): FolioCharge {
  return {
    id: row.id as string,
    reservationId: row.reservation_id as string,
    sku: row.sku as string,
    name: row.name as string,
    qty: row.qty as number,
    unitPriceNgn: row.unit_price_ngn as number,
    status: row.status as FolioChargeStatus,
    createdAt: row.created_at as string,
    paidAt: (row.paid_at as string | null) ?? undefined,
  };
}

export async function listFolioCharges(
  reservationId?: string,
): Promise<FolioCharge[]> {
  if (!isSupabaseEnabled()) {
    const file = await readFile();
    const charges = reservationId
      ? file.charges.filter((c) => c.reservationId === reservationId)
      : file.charges;
    return [...charges].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  let query = supabase
    .from("folio_charges")
    .select("id, reservation_id, sku, name, qty, unit_price_ngn, status, created_at, paid_at")
    .order("created_at", { ascending: false });

  if (reservationId) {
    query = query.eq("reservation_id", reservationId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function addFolioCharge(input: {
  reservationId: string;
  sku: string;
  qty: number;
}): Promise<FolioCharge> {
  const catalogItem = findFnbCatalogItem(input.sku);
  if (!catalogItem) {
    throw new FolioStoreError(`Unknown catalog item: ${input.sku}`, 404);
  }

  if (!isSupabaseEnabled()) {
    const file = await readFile();
    const charge: FolioCharge = {
      id: randomUUID(),
      reservationId: input.reservationId,
      sku: catalogItem.id,
      name: catalogItem.name,
      qty: input.qty,
      unitPriceNgn: catalogItem.priceNgn,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    file.charges.unshift(charge);
    await writeFile(file);
    return charge;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new FolioStoreError("Supabase not configured", 500);

  const { data, error } = await supabase
    .from("folio_charges")
    .insert({
      reservation_id: input.reservationId,
      sku: catalogItem.id,
      name: catalogItem.name,
      qty: input.qty,
      unit_price_ngn: catalogItem.priceNgn,
      status: "open",
    })
    .select("id, reservation_id, sku, name, qty, unit_price_ngn, status, created_at, paid_at")
    .single();

  if (error || !data) {
    throw new FolioStoreError(error?.message ?? "Insert charge failed", 500);
  }
  return mapRow(data);
}

export async function updateFolioChargeStatus(
  id: string,
  nextStatus: FolioChargeStatus,
): Promise<FolioCharge> {
  if (!isSupabaseEnabled()) {
    const file = await readFile();
    const index = file.charges.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new FolioStoreError("Charge not found", 404);
    }
    const current = file.charges[index];
    if (isTerminalFolioStatus(current.status)) {
      throw new FolioStoreError(
        `Charge is already ${current.status} and cannot be changed`,
        409,
      );
    }
    const updated: FolioCharge = {
      ...current,
      status: nextStatus,
      paidAt: nextStatus === "paid" ? new Date().toISOString() : current.paidAt,
    };
    file.charges[index] = updated;
    await writeFile(file);
    return updated;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new FolioStoreError("Supabase not configured", 500);

  const { data: existing, error: fetchError } = await supabase
    .from("folio_charges")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw new FolioStoreError(fetchError.message, 500);
  if (!existing) throw new FolioStoreError("Charge not found", 404);
  if (isTerminalFolioStatus(existing.status as FolioChargeStatus)) {
    throw new FolioStoreError(
      `Charge is already ${existing.status} and cannot be changed`,
      409,
    );
  }

  const { data, error } = await supabase
    .from("folio_charges")
    .update({
      status: nextStatus,
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id, reservation_id, sku, name, qty, unit_price_ngn, status, created_at, paid_at")
    .single();

  if (error || !data) {
    throw new FolioStoreError(error?.message ?? "Update charge failed", 500);
  }
  return mapRow(data);
}
