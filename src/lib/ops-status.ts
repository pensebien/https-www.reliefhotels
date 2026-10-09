/**
 * Operator-visible health per integration area (rayza, payments, outbox, …):
 * error count, last error and when, and the last success. Logs give the
 * history; this gives staff the at-a-glance state on Staff → System health.
 * Supabase `ops_status` (migration 024), or a JSON file in file mode.
 */

import { dataPath } from "@/lib/data-dir";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";
import { Logger, redact } from "@/lib/logger";

export const OPS_SCOPES = ["payments", "rayza", "outbox", "email", "auth", "cron"] as const;
export type OpsScope = (typeof OPS_SCOPES)[number];

export type OpsStatus = {
  scope: OpsScope;
  errorCount: number;
  lastError?: string;
  lastErrorAt?: string;
  lastOkAt?: string;
};

const FILE = dataPath("ops-status.json");
type Store = { scopes: Partial<Record<OpsScope, OpsStatus>> };
const empty = (): Store => ({ scopes: {} });
const log = new Logger("ops");

async function update(scope: OpsScope, change: (current: OpsStatus) => OpsStatus): Promise<void> {
  try {
    if (!isSupabaseEnabled()) {
      await updateJsonFile(FILE, empty, (store) => {
        store.scopes[scope] = change(store.scopes[scope] ?? { scope, errorCount: 0 });
      });
      return;
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) return;
    const { data } = await supabase.from("ops_status").select().eq("scope", scope).maybeSingle();
    const next = change(
      data
        ? {
            scope,
            errorCount: data.error_count as number,
            lastError: (data.last_error as string | null) ?? undefined,
            lastErrorAt: (data.last_error_at as string | null) ?? undefined,
            lastOkAt: (data.last_ok_at as string | null) ?? undefined,
          }
        : { scope, errorCount: 0 },
    );
    const { error } = await supabase.from("ops_status").upsert({
      scope,
      error_count: next.errorCount,
      last_error: next.lastError ?? null,
      last_error_at: next.lastErrorAt ?? null,
      last_ok_at: next.lastOkAt ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    log.warning("Could not record ops status", { scope, error: e instanceof Error ? e.message : String(e) });
  }
}

/** Count a failure and keep its message (secrets stripped) for the health page. */
export function recordOpsError(scope: OpsScope, message: string, context?: Record<string, unknown>): Promise<void> {
  const detail = context ? `${message} ${JSON.stringify(redact(context))}` : message;
  return update(scope, (s) => ({ ...s, errorCount: s.errorCount + 1, lastError: detail.slice(0, 500), lastErrorAt: new Date().toISOString() }));
}

/** A successful run clears the count (the last error stays visible with its time). */
export function recordOpsOk(scope: OpsScope): Promise<void> {
  return update(scope, (s) => ({ ...s, errorCount: 0, lastOkAt: new Date().toISOString() }));
}

export async function listOpsStatus(): Promise<OpsStatus[]> {
  let stored: Partial<Record<OpsScope, OpsStatus>> = {};
  if (!isSupabaseEnabled()) {
    stored = (await readJsonFile(FILE, empty)).scopes;
  } else {
    const { data } = (await getSupabaseAdmin()?.from("ops_status").select()) ?? { data: [] };
    for (const r of data ?? []) {
      stored[r.scope as OpsScope] = {
        scope: r.scope as OpsScope,
        errorCount: r.error_count as number,
        lastError: (r.last_error as string | null) ?? undefined,
        lastErrorAt: (r.last_error_at as string | null) ?? undefined,
        lastOkAt: (r.last_ok_at as string | null) ?? undefined,
      };
    }
  }
  return OPS_SCOPES.map((scope) => stored[scope] ?? { scope, errorCount: 0 });
}
