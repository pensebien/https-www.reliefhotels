/**
 * Notification outbox: guest emails and manager alerts that failed to send
 * (provider down, network blip) are queued here and retried by the scheduled
 * job with growing gaps, so a Resend or Termii outage doesn't silently lose a
 * booking confirmation. Supabase `notification_outbox` (migration 024), or a
 * JSON file in file mode.
 */

import { Logger } from "@/lib/logger";
import { recordOpsError } from "@/lib/ops-status";
import { randomUUID } from "node:crypto";
import { dataPath } from "@/lib/data-dir";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";

const log = new Logger("outbox");

export type OutboxKind = "email" | "manager-alert";

export type OutboxItem = {
  id: string;
  kind: OutboxKind;
  payload: Record<string, unknown>;
  attempts: number;
  status: "pending" | "sent" | "failed";
  lastError?: string;
  nextAttemptAt: string;
  createdAt: string;
};

/** Minutes to wait before each retry; after the last one the item is marked failed. */
export const RETRY_MINUTES = [5, 15, 60, 240, 720];

const FILE = dataPath("notification-outbox.json");
type Store = { items: OutboxItem[] };
const empty = (): Store => ({ items: [] });

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

export async function enqueueNotification(kind: OutboxKind, payload: Record<string, unknown>, error?: string): Promise<void> {
  const item: OutboxItem = {
    id: randomUUID(),
    kind,
    payload,
    attempts: 1,
    status: "pending",
    lastError: error?.slice(0, 500),
    nextAttemptAt: inMinutes(RETRY_MINUTES[0]),
    createdAt: new Date().toISOString(),
  };
  try {
    if (!isSupabaseEnabled()) {
      await updateJsonFile(FILE, empty, (store) => {
        store.items = [item, ...store.items].slice(0, 1000);
      });
      return;
    }
    const { error: dbError } = (await getSupabaseAdmin()?.from("notification_outbox").insert({
      id: item.id,
      kind,
      payload,
      attempts: item.attempts,
      status: item.status,
      last_error: item.lastError ?? null,
      next_attempt_at: item.nextAttemptAt,
    })) ?? { error: null };
    if (dbError) throw new Error(dbError.message);
  } catch (e) {
    // Never let the safety net break the request that tried to notify.
    log.error("Could not queue notification", { kind, error: e instanceof Error ? e.message : String(e) });
    void recordOpsError("outbox", "Could not queue notification", { kind });
  }
}

async function dueItems(limit: number): Promise<OutboxItem[]> {
  const now = new Date().toISOString();
  if (!isSupabaseEnabled()) {
    const { items } = await readJsonFile(FILE, empty);
    return items.filter((i) => i.status === "pending" && i.nextAttemptAt <= now).slice(0, limit);
  }
  const { data, error } = (await getSupabaseAdmin()
    ?.from("notification_outbox")
    .select()
    .eq("status", "pending")
    .lte("next_attempt_at", now)
    .order("next_attempt_at")
    .limit(limit)) ?? { data: [], error: null };
  if (error) {
    log.error("Could not read outbox", { error: error.message });
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    kind: r.kind as OutboxKind,
    payload: r.payload as Record<string, unknown>,
    attempts: r.attempts as number,
    status: r.status as OutboxItem["status"],
    lastError: (r.last_error as string | null) ?? undefined,
    nextAttemptAt: r.next_attempt_at as string,
    createdAt: r.created_at as string,
  }));
}

async function saveItem(item: OutboxItem): Promise<void> {
  if (!isSupabaseEnabled()) {
    await updateJsonFile(FILE, empty, (store) => {
      store.items = store.items.map((i) => (i.id === item.id ? item : i));
    });
    return;
  }
  await getSupabaseAdmin()
    ?.from("notification_outbox")
    .update({ attempts: item.attempts, status: item.status, last_error: item.lastError ?? null, next_attempt_at: item.nextAttemptAt })
    .eq("id", item.id);
}

async function deliver(item: OutboxItem): Promise<{ ok: boolean; error?: string }> {
  if (item.kind === "email") {
    const { deliverQueuedEmail } = await import("@/lib/email");
    return deliverQueuedEmail(item.payload);
  }
  const { notifyManager } = await import("@/lib/notifications");
  const result = await notifyManager(item.payload as unknown as Parameters<typeof notifyManager>[0], { fromOutbox: true });
  return { ok: result.sent, error: result.error };
}

export type OutboxRunSummary = { sent: number; retrying: number; failed: number };

/** Retry what's due. Safe to run often; each item is tried at most once per run. */
export async function processOutbox(limit = 25): Promise<OutboxRunSummary> {
  const summary: OutboxRunSummary = { sent: 0, retrying: 0, failed: 0 };
  for (const item of await dueItems(limit)) {
    let result: { ok: boolean; error?: string };
    try {
      result = await deliver(item);
    } catch (e) {
      result = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    const attempts = item.attempts + 1;
    if (result.ok) {
      await saveItem({ ...item, attempts, status: "sent", lastError: undefined });
      summary.sent++;
    } else if (attempts > RETRY_MINUTES.length) {
      await saveItem({ ...item, attempts, status: "failed", lastError: result.error?.slice(0, 500) });
      log.error("Notification gave up after retries", { kind: item.kind, outbox_id: item.id, attempts, error: result.error });
      await recordOpsError("outbox", "Notification gave up after retries", { kind: item.kind, outbox_id: item.id, error: result.error });
      summary.failed++;
    } else {
      await saveItem({ ...item, attempts, lastError: result.error?.slice(0, 500), nextAttemptAt: inMinutes(RETRY_MINUTES[attempts - 1]) });
      summary.retrying++;
    }
  }
  return summary;
}

/** Pending and failed items, newest first (staff health view, tests). */
export async function outboxBacklog(): Promise<{ pending: number; failed: number }> {
  if (!isSupabaseEnabled()) {
    const { items } = await readJsonFile(FILE, empty);
    return { pending: items.filter((i) => i.status === "pending").length, failed: items.filter((i) => i.status === "failed").length };
  }
  const count = async (status: string) =>
    (await getSupabaseAdmin()?.from("notification_outbox").select("id", { count: "exact", head: true }).eq("status", status))?.count ?? 0;
  const [pending, failed] = await Promise.all([count("pending"), count("failed")]);
  return { pending, failed };
}
