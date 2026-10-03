/**
 * Guest profiles (Sirvoy "Guests"): every guest, built from their bookings
 * (matched by email), plus staff-kept tags, company, notes and a blocked
 * flag. Blocked guests can't book online.
 */

import { dataPath } from "@/lib/data-dir";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { getActivity, type ReservationRecord } from "@/lib/demo-store";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";
import { rooms } from "@/content/site";
import { z } from "zod";

export const profileEditSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(30)).max(10),
  company: z.string().trim().max(120),
  notes: z.string().trim().max(2000),
  blocked: z.boolean(),
});

export type ProfileEdits = z.infer<typeof profileEditSchema> & { email: string; updatedAt: string };

export type GuestSummary = {
  email: string;
  name: string;
  phone?: string;
  stays: number;
  nights: number;
  valueNgn: number;
  firstStay?: string;
  lastStay?: string;
  upcoming?: string;
  returning: boolean;
  tags: string[];
  company: string;
  notes: string;
  blocked: boolean;
};

const FILE = dataPath("guest-profiles.json");
type Store = { profiles: ProfileEdits[] };
const empty = (): Store => ({ profiles: [] });
const norm = (email: string) => email.trim().toLowerCase();

export async function listProfileEdits(): Promise<ProfileEdits[]> {
  if (!isSupabaseEnabled()) return (await readJsonFile(FILE, empty)).profiles;
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase.from("guest_profiles").select();
  if (error) return [];
  return (data ?? []).map((r) => ({
    email: r.email as string,
    tags: (r.tags as string[] | null) ?? [],
    company: (r.company as string | null) ?? "",
    notes: (r.notes as string | null) ?? "",
    blocked: Boolean(r.blocked),
    updatedAt: r.updated_at as string,
  }));
}

export async function saveProfileEdits(email: string, input: unknown): Promise<ProfileEdits> {
  const parsed = profileEditSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const record: ProfileEdits = { ...parsed.data, email: norm(email), updatedAt: new Date().toISOString() };
  if (!isSupabaseEnabled()) {
    await updateJsonFile(FILE, empty, (store) => {
      store.profiles = [record, ...store.profiles.filter((p) => p.email !== record.email)];
    });
    return record;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("guest_profiles").upsert({
    email: record.email,
    tags: record.tags,
    company: record.company,
    notes: record.notes,
    blocked: record.blocked,
    updated_at: record.updatedAt,
  });
  if (error) throw new Error(error.message);
  return record;
}

export async function isGuestBlocked(email: string): Promise<boolean> {
  return (await listProfileEdits()).some((p) => p.email === norm(email) && p.blocked);
}

/** All room reservations (uncapped; Supabase pages through 1000 at a time). */
async function allRoomReservations(): Promise<ReservationRecord[]> {
  if (!isSupabaseEnabled()) return (await getActivity()).reservations.filter((r) => r.itemType === "room");
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { mapReservationRow } = await import("@/lib/db/booking-store");
  const out: ReservationRecord[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("reservations")
      .select()
      .eq("item_type", "room")
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []).map(mapReservationRow));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Pure: fold bookings and staff edits into one row per guest. */
export function buildGuestSummaries(
  reservations: ReservationRecord[],
  edits: ProfileEdits[],
  today: string,
): GuestSummary[] {
  const byEmail = new Map<string, ReservationRecord[]>();
  for (const r of reservations) {
    if (!r.email) continue;
    const key = norm(r.email);
    byEmail.set(key, [...(byEmail.get(key) ?? []), r]);
  }
  const editOf = new Map(edits.map((e) => [e.email, e]));
  const summaries: GuestSummary[] = [];
  for (const [email, list] of byEmail) {
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const latest = sorted[sorted.length - 1];
    const kept = list.filter((r) => r.status !== "cancelled");
    const value = kept.reduce((sum, r) => {
      const catalog = rooms.find((x) => x.id === r.roomId)?.priceFrom ?? 0;
      return sum + (r.quotedTotalNgn ?? catalog * (r.nights ?? 1) * (r.units ?? 1));
    }, 0);
    const checkIns = kept.map((r) => r.checkIn).filter(Boolean).sort() as string[];
    const past = checkIns.filter((d) => d < today);
    const edit = editOf.get(email);
    summaries.push({
      email,
      name: `${latest.firstName} ${latest.lastName}`.trim(),
      phone: [...sorted].reverse().find((r) => r.phone)?.phone,
      stays: kept.length,
      nights: kept.reduce((sum, r) => sum + (r.nights ?? 0), 0),
      valueNgn: Math.round(value),
      firstStay: checkIns[0],
      lastStay: past[past.length - 1],
      upcoming: checkIns.find((d) => d >= today),
      returning: kept.length > 1,
      tags: edit?.tags ?? [],
      company: edit?.company ?? "",
      notes: edit?.notes ?? "",
      blocked: edit?.blocked ?? false,
    });
  }
  return summaries.sort((a, b) => (b.lastStay ?? b.upcoming ?? "").localeCompare(a.lastStay ?? a.upcoming ?? ""));
}

export async function listGuests(today: string): Promise<{ guests: GuestSummary[]; bookings: Map<string, ReservationRecord[]> }> {
  const [reservations, edits] = await Promise.all([allRoomReservations(), listProfileEdits()]);
  const bookings = new Map<string, ReservationRecord[]>();
  for (const r of reservations) {
    if (!r.email) continue;
    bookings.set(norm(r.email), [...(bookings.get(norm(r.email)) ?? []), r]);
  }
  return { guests: buildGuestSummaries(reservations, edits, today), bookings };
}
