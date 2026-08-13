/**
 * Owner-editable Nigerian VAT settings (Agent R).
 *
 * Runtime-editable (Supabase row or file-store, not an env var) because the
 * hotel owner changes this from /staff/settings/tax, not a deploy. Default
 * matches the current federal VAT rate (7.5%); collectionMode decides who
 * bears it: itemized on top of the guest's bill ("pass_through", the
 * default), or already folded into the displayed price and remitted from
 * margin ("absorbed"). See ADR-009 — VAT only, no second state-consumption-
 * tax slot for now.
 */

import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { promises as fs } from "fs";
import path from "path";

export type TaxCollectionMode = "absorbed" | "pass_through";

export type TaxSettings = {
  vatPercentage: number;
  collectionMode: TaxCollectionMode;
  updatedAt: string;
};

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  vatPercentage: 7.5,
  collectionMode: "pass_through",
  updatedAt: new Date(0).toISOString(),
};

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(STORE_DIR, "tax-settings.json");

async function readFile(): Promise<TaxSettings> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    return JSON.parse(raw) as TaxSettings;
  } catch {
    await writeFile(DEFAULT_TAX_SETTINGS);
    return DEFAULT_TAX_SETTINGS;
  }
}

async function writeFile(data: TaxSettings): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function getTaxSettings(): Promise<TaxSettings> {
  if (!isSupabaseEnabled()) return readFile();

  const supabase = getSupabaseAdmin();
  if (!supabase) return DEFAULT_TAX_SETTINGS;

  const { data, error } = await supabase
    .from("tax_settings")
    .select("vat_percentage, collection_mode, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return DEFAULT_TAX_SETTINGS;

  return {
    vatPercentage: data.vat_percentage as number,
    collectionMode: data.collection_mode as TaxCollectionMode,
    updatedAt: data.updated_at as string,
  };
}

export async function updateTaxSettings(patch: {
  vatPercentage?: number;
  collectionMode?: TaxCollectionMode;
}): Promise<TaxSettings> {
  const current = await getTaxSettings();
  const next: TaxSettings = {
    vatPercentage: patch.vatPercentage ?? current.vatPercentage,
    collectionMode: patch.collectionMode ?? current.collectionMode,
    updatedAt: new Date().toISOString(),
  };

  if (!isSupabaseEnabled()) {
    await writeFile(next);
    return next;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { error } = await supabase.from("tax_settings").upsert({
    id: 1,
    vat_percentage: next.vatPercentage,
    collection_mode: next.collectionMode,
    updated_at: next.updatedAt,
  });

  if (error) throw new Error(error.message);
  return next;
}
