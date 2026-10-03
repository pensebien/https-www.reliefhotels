/**
 * Small owner-editable JSON documents (room setup, guest message templates…),
 * one row per key in Supabase `app_settings`, or data/settings/<key>.json in
 * file mode. Same shape as tax-settings / rate-config, without a table per
 * setting. Callers validate with zod: readers normalize whatever is stored,
 * writers must pass a validated document.
 */

import { dataPath } from "@/lib/data-dir";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { readJsonFile, writeJsonFile } from "@/lib/json-file-store";

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: unknown; at: number }>();

function settingsFile(key: string): string {
  return dataPath("settings", `${key}.json`);
}

async function loadRaw(key: string): Promise<unknown> {
  if (!isSupabaseEnabled()) {
    return readJsonFile<unknown>(settingsFile(key), () => null);
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  // Table missing (migration not applied) → behave as "nothing saved yet".
  if (error || !data) return null;
  return data.value;
}

/** Cached for 30s per server instance. `normalize` turns stored JSON (or null) into T. */
export async function readSettingsDoc<T>(
  key: string,
  normalize: (raw: unknown) => T,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = normalize(await loadRaw(key));
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function writeSettingsDoc<T>(key: string, value: T): Promise<T> {
  if (!isSupabaseEnabled()) {
    await writeJsonFile(settingsFile(key), value);
  } else {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }
  cache.set(key, { value, at: Date.now() });
  return value;
}

/** Test seam. */
export function clearSettingsCache(): void {
  cache.clear();
}
