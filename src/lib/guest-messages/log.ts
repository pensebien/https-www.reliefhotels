/**
 * Send log for scheduled guest messages, one row per (template, booking).
 * A row is claimed before sending, so two overlapping runs can never send
 * the same message twice; the row then records sent / failed / not_configured.
 */

import { dataPath } from "@/lib/data-dir";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";
import { randomUUID } from "crypto";

export type MessageStatus = "sending" | "sent" | "failed" | "not_configured";

export type MessageLogEntry = {
  id: string;
  templateId: string;
  reservationId: string;
  channel: "email" | "sms" | "whatsapp";
  recipient: string;
  status: MessageStatus;
  createdAt: string;
};

const FILE = dataPath("guest-message-log.json");
type Store = { entries: MessageLogEntry[] };
const empty = (): Store => ({ entries: [] });

/** Claims the (template, booking) slot; false if it was already claimed. */
export async function claimMessage(
  entry: Omit<MessageLogEntry, "id" | "status" | "createdAt">,
): Promise<string | null> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  if (!isSupabaseEnabled()) {
    return updateJsonFile(FILE, empty, (store) => {
      if (store.entries.some((e) => e.templateId === entry.templateId && e.reservationId === entry.reservationId)) {
        return null;
      }
      store.entries.unshift({ ...entry, id, status: "sending", createdAt });
      store.entries = store.entries.slice(0, 2000);
      return id;
    });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("guest_message_log").insert({
    id,
    template_id: entry.templateId,
    reservation_id: entry.reservationId,
    channel: entry.channel,
    recipient: entry.recipient,
    status: "sending",
    created_at: createdAt,
  });
  if (error?.code === "23505") return null;
  if (error) throw new Error(error.message);
  return id;
}

export async function settleMessage(id: string, status: Exclude<MessageStatus, "sending">): Promise<void> {
  if (!isSupabaseEnabled()) {
    await updateJsonFile(FILE, empty, (store) => {
      const entry = store.entries.find((e) => e.id === id);
      if (entry) entry.status = status;
    });
    return;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("guest_message_log").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function recentMessages(limit = 50): Promise<MessageLogEntry[]> {
  if (!isSupabaseEnabled()) {
    return (await readJsonFile(FILE, empty)).entries.slice(0, limit);
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("guest_message_log")
    .select()
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id as string,
    templateId: row.template_id as string,
    reservationId: row.reservation_id as string,
    channel: row.channel as MessageLogEntry["channel"],
    recipient: row.recipient as string,
    status: row.status as MessageStatus,
    createdAt: row.created_at as string,
  }));
}
