/**
 * RAYZA HMS sync: which Relief room type is which RAYZA room type, live
 * availability and prices from RAYZA, pushing/cancelling bookings, and the
 * per-reservation sync status staff see and the scheduled job retries.
 *
 * RAYZA is the hotel's source of truth (front desk, F&B, OTA channels, HMS
 * blocks, rates). The website only sells what RAYZA says is free, at RAYZA's
 * price, and hands every paid booking back to it.
 */

import { Logger } from "@/lib/logger";
import { recordOpsError, recordOpsOk } from "@/lib/ops-status";
import { rooms } from "@/content/site";
import { roomDisplayName } from "@/lib/room-names";
import { dataPath } from "@/lib/data-dir";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import {
  listPaymentsForReservation,
  listReservationsForReport,
  updateReservationById,
  type ReservationRecord,
} from "@/lib/demo-store";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";
import { readSettingsDoc, writeSettingsDoc } from "@/lib/settings-store";
import { z } from "zod";
import {
  buildBookingBodies,
  cancelRayzaBooking,
  createRayzaBooking,
  fetchRayzaCatalogue,
  isRayzaEnabled,
  legacyRayzaReference,
  rayzaReferences,
  type RayzaCatalogue,
} from "./rayza-connect";

const log = new Logger("rayza");

// ─── Room links (Relief room type → RAYZA room type) ────────────────────

const LINKS_KEY = "rayza_room_links";
const linksSchema = z.object({ links: z.record(z.string(), z.string().min(1).max(120)) });
const linkDocSchema = linksSchema.extend({
  /** When each room type was (re)linked: older bookings aren't backfilled automatically. */
  since: z.record(z.string(), z.string()).default({}),
});
type LinkDoc = z.infer<typeof linkDocSchema>;
export type RayzaRoomLinks = Record<string, string>;

function getLinkDoc(): Promise<LinkDoc> {
  return readSettingsDoc(LINKS_KEY, (raw) => {
    const parsed = linkDocSchema.safeParse(raw);
    return parsed.success ? parsed.data : { links: {}, since: {} };
  });
}

export async function getRayzaRoomLinks(): Promise<RayzaRoomLinks> {
  return (await getLinkDoc()).links;
}

export async function saveRayzaRoomLinks(input: unknown): Promise<RayzaRoomLinks> {
  const parsed = linksSchema.safeParse(input);
  if (!parsed.success) throw new Error("Choose a RAYZA room type for each linked room");
  const known = new Set<string>(rooms.map((r) => r.id));
  const links = Object.fromEntries(Object.entries(parsed.data.links).filter(([roomId, type]) => known.has(roomId) && type));
  const types = Object.values(links);
  if (new Set(types).size !== types.length) throw new Error("Each RAYZA room type can be linked to one Relief room type");
  const previous = await getLinkDoc();
  const now = new Date().toISOString();
  const since = Object.fromEntries(
    Object.entries(links).map(([roomId, type]) => [
      roomId,
      previous.links[roomId] === type && previous.since[roomId] ? previous.since[roomId] : now,
    ]),
  );
  return (await writeSettingsDoc(LINKS_KEY, { links, since })).links;
}

// ─── Catalogue cache ─────────────────────────────────────────────────────

const CATALOGUE_TTL_MS = 30_000;
const catalogueCache = new Map<string, { at: number; catalogue: RayzaCatalogue }>();

async function catalogue(
  dates?: { checkIn: string; checkOut: string },
  fresh = false,
): Promise<{ ok: true; catalogue: RayzaCatalogue } | { ok: false; error: string }> {
  const key = dates ? `${dates.checkIn}_${dates.checkOut}` : "all";
  const hit = catalogueCache.get(key);
  if (!fresh && hit && Date.now() - hit.at < CATALOGUE_TTL_MS) return { ok: true, catalogue: hit.catalogue };
  const result = dates ? await fetchRayzaCatalogue(dates) : await fullCatalogue();
  if (result.ok) catalogueCache.set(key, { at: Date.now(), catalogue: result.catalogue });
  return result;
}

const shiftDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Every room number per type. Without dates the relay only lists rooms free
 * today (its docs say all rooms), so nights far ahead — when nothing is booked
 * yet — fill in the rest.
 */
async function fullCatalogue(): Promise<{ ok: true; catalogue: RayzaCatalogue } | { ok: false; error: string }> {
  const base = await fetchRayzaCatalogue();
  if (!base.ok) return base;
  const numbers = new Map(base.catalogue.rooms.map((r) => [r.id, new Set(r.roomNumbers)]));
  const short = () => base.catalogue.rooms.some((r) => numbers.get(r.id)!.size < r.totalRooms);
  for (const days of [400, 600, 800]) {
    if (!short()) break;
    const later = await fetchRayzaCatalogue({ checkIn: shiftDays(days), checkOut: shiftDays(days + 1) });
    if (!later.ok) break;
    for (const r of later.catalogue.rooms) for (const n of r.roomNumbers) numbers.get(r.id)?.add(n);
  }
  const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
  return {
    ok: true,
    catalogue: {
      ...base.catalogue,
      rooms: base.catalogue.rooms.map((r) => ({ ...r, roomNumbers: [...numbers.get(r.id)!].sort(natural) })),
    },
  };
}

/** Test seam. */
export function clearRayzaCache(): void {
  catalogueCache.clear();
}

// ─── Availability ────────────────────────────────────────────────────────

export type RayzaRoomCheck = {
  free: number;
  maxOccupancy: number;
  /** RAYZA's tax-inclusive nightly price for one room. */
  nightlyNgn: number;
  reason?: string;
};

/** Per linked Relief room type, what RAYZA can still sell for [checkIn, checkOut). */
export function rayzaChecksFrom(
  cat: RayzaCatalogue,
  links: RayzaRoomLinks,
  nights: number,
): Record<string, RayzaRoomCheck> {
  const checks: Record<string, RayzaRoomCheck> = {};
  for (const [roomId, typeId] of Object.entries(links)) {
    const type = cat.rooms.find((r) => r.id === typeId);
    if (!type) {
      checks[roomId] = { free: 0, maxOccupancy: 0, nightlyNgn: 0, reason: `RAYZA no longer has the room type "${typeId}"` };
      continue;
    }
    const base = { maxOccupancy: type.maxOccupancy, nightlyNgn: type.priceWithTaxNgn };
    if (type.closedToArrival) {
      checks[roomId] = { ...base, free: 0, reason: "Arrivals are closed on this date" };
    } else if (type.closedToDeparture) {
      checks[roomId] = { ...base, free: 0, reason: "Departures are closed on this date" };
    } else if (nights < type.minLos) {
      checks[roomId] = { ...base, free: 0, reason: `Minimum stay is ${type.minLos} nights` };
    } else {
      checks[roomId] = { ...base, free: type.availableCount };
    }
  }
  return checks;
}

export type RayzaOffers =
  | { ok: true; checks: Record<string, RayzaRoomCheck> }
  | { ok: false; reason: "disabled" | "unlinked" | "unreachable"; error?: string };

/**
 * What RAYZA can sell for [checkIn, checkOut), per linked Relief room type.
 * Not ok means the website can't sell rooms right now: there is no local
 * fallback, because guessing is how double bookings happen.
 * `fresh` skips the 30-second cache; the booking write path uses it.
 */
export async function rayzaOffers(
  checkIn: string,
  checkOut: string,
  nights: number,
  fresh = false,
): Promise<RayzaOffers> {
  if (!isRayzaEnabled()) return { ok: false, reason: "disabled" };
  const links = await getRayzaRoomLinks();
  if (Object.keys(links).length === 0) return { ok: false, reason: "unlinked" };
  const result = await catalogue({ checkIn, checkOut }, fresh);
  if (!result.ok) {
    log.warning("RAYZA availability unavailable", { check_in: checkIn, check_out: checkOut, error: result.error });
    await recordOpsError("rayza", "RAYZA availability unavailable", { error: result.error });
    return { ok: false, reason: "unreachable", error: result.error };
  }
  return { ok: true, checks: rayzaChecksFrom(result.catalogue, links, nights) };
}

// ─── Sync status ─────────────────────────────────────────────────────────

export type RayzaSyncRow = {
  reservationId: string;
  state: "pushed" | "cancelled" | "failed";
  wanted: "booked" | "cancelled";
  refs: string[];
  code?: string;
  error?: string;
  attempts: number;
  at: string;
};

const LOG = dataPath("rayza-sync.json");
type LogStore = { rows: RayzaSyncRow[] };

function fromDb(r: Record<string, unknown>): RayzaSyncRow {
  return {
    reservationId: r.reservation_id as string,
    state: r.state as RayzaSyncRow["state"],
    wanted: r.wanted as RayzaSyncRow["wanted"],
    refs: (r.refs as string[] | null) ?? [],
    code: (r.code as string | null) ?? undefined,
    error: (r.error as string | null) ?? undefined,
    attempts: (r.attempts as number) ?? 1,
    at: r.at as string,
  };
}

export async function getSyncRows(ids: string[]): Promise<Map<string, RayzaSyncRow>> {
  if (ids.length === 0) return new Map();
  if (!isSupabaseEnabled()) {
    const { rows } = await readJsonFile(LOG, (): LogStore => ({ rows: [] }));
    const wanted = new Set(ids);
    return new Map(rows.filter((r) => wanted.has(r.reservationId)).map((r) => [r.reservationId, r]));
  }
  const map = new Map<string, RayzaSyncRow>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = (await getSupabaseAdmin()
      ?.from("rayza_sync")
      .select()
      .in("reservation_id", ids.slice(i, i + 200))) ?? { data: [], error: null };
    // Table missing (migration 022 not applied): sync still works, just without history.
    if (error) {
      log.error("Could not read sync status", { error: error.message });
      return map;
    }
    for (const r of data ?? []) map.set(r.reservation_id as string, fromDb(r));
  }
  return map;
}

export async function recentSyncRows(limit = 40): Promise<RayzaSyncRow[]> {
  if (!isSupabaseEnabled()) {
    const { rows } = await readJsonFile(LOG, (): LogStore => ({ rows: [] }));
    return [...rows].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  }
  const { data } = (await getSupabaseAdmin()?.from("rayza_sync").select().order("at", { ascending: false }).limit(limit)) ?? {
    data: [],
  };
  return (data ?? []).map(fromDb);
}

async function saveSyncRow(row: Omit<RayzaSyncRow, "attempts" | "at">, previous?: RayzaSyncRow): Promise<RayzaSyncRow> {
  const sameFailure = previous?.state === "failed" && row.state === "failed" && previous.wanted === row.wanted;
  const full: RayzaSyncRow = { ...row, attempts: sameFailure ? previous.attempts + 1 : 1, at: new Date().toISOString() };
  if (!isSupabaseEnabled()) {
    await updateJsonFile(LOG, (): LogStore => ({ rows: [] }), (store) => {
      store.rows = [full, ...store.rows.filter((r) => r.reservationId !== full.reservationId)].slice(0, 2000);
    });
    return full;
  }
  const { error } = (await getSupabaseAdmin()?.from("rayza_sync").upsert({
    reservation_id: full.reservationId,
    state: full.state,
    wanted: full.wanted,
    refs: full.refs,
    code: full.code ?? null,
    error: full.error ?? null,
    attempts: full.attempts,
    at: full.at,
  })) ?? { error: null };
  if (error) log.error("Could not record sync status", { reservation_id: full.reservationId, error: error.message });
  return full;
}

/** Tell the front desk once, on the booking itself, when RAYZA turns it down. */
async function noteFailure(record: ReservationRecord, row: RayzaSyncRow, previous?: RayzaSyncRow): Promise<void> {
  if (previous?.state === "failed" && previous.code === row.code && previous.wanted === row.wanted) return;
  const what = row.wanted === "booked" ? "did not accept this booking" : "could not cancel this booking";
  const note = `RAYZA HMS ${what}${row.code ? ` (${row.code})` : ""}: ${row.error}. Check the room in RAYZA.`;
  await updateReservationById(record.id, {
    staffNotes: record.staffNotes ? `${record.staffNotes}\n${note}` : note,
  }).catch(() => null);
}

// ─── Push / cancel / move ────────────────────────────────────────────────

export type RayzaSyncResult =
  | { ok: true; skipped: true }
  | { ok: true; skipped?: false; refs: string[] }
  | { ok: false; code?: string; error: string };

async function paidNgn(record: ReservationRecord): Promise<number> {
  const payments = await listPaymentsForReservation(record.id);
  return payments.filter((p) => p.status === "success").reduce((sum, p) => sum + p.amountKobo / 100, 0);
}

function bookable(record: ReservationRecord): boolean {
  return record.itemType === "room" && Boolean(record.checkIn && record.checkOut && record.roomId);
}

/** Create the booking on RAYZA (one RAYZA booking per room). Safe to repeat. */
export async function pushReservationToRayza(record: ReservationRecord): Promise<RayzaSyncResult> {
  if (!isRayzaEnabled() || !bookable(record)) return { ok: true, skipped: true };
  const typeId = (await getRayzaRoomLinks())[record.roomId!];
  if (!typeId || record.source === "demo") return { ok: true, skipped: true };
  const previous = (await getSyncRows([record.id])).get(record.id);
  const fail = async (code: string | undefined, error: string, refs: string[] = []): Promise<RayzaSyncResult> => {
    const row = await saveSyncRow({ reservationId: record.id, state: "failed", wanted: "booked", refs, code, error }, previous);
    await noteFailure(record, row, previous);
    log.error("RAYZA refused booking", { reservation_id: record.id, code, error });
    await recordOpsError("rayza", "RAYZA refused booking", { reservation_id: record.id, code, error });
    return { ok: false, code, error };
  };

  if ((record.phone?.trim().length ?? 0) < 7) return fail("MISSING_PHONE", "RAYZA needs the guest's phone number");

  // RAYZA assigns the room numbers.
  const bodies = buildBookingBodies(record, {
    roomType: typeId,
    roomNumbers: [],
    paidNgn: await paidNgn(record),
    isTest: process.env.DEMO_MODE === "true",
  });

  const refs: string[] = [];
  for (const body of bodies) {
    const result = await createRayzaBooking(body);
    if (!result.ok) return fail(result.code, result.error, refs);
    if (result.reference !== body.booking_reference) {
      log.warning("RAYZA stored a different reference", { reservation_id: record.id, sent: body.booking_reference, stored: result.reference });
    }
    refs.push(result.reference);
  }
  await saveSyncRow({ reservationId: record.id, state: "pushed", wanted: "booked", refs }, previous);
  log.info("Booking pushed to RAYZA", { reservation_id: record.id, refs });
  await recordOpsOk("rayza");
  return { ok: true, refs };
}

/** Release the booking on RAYZA. A reference RAYZA never had counts as released. */
export async function cancelReservationOnRayza(record: ReservationRecord): Promise<RayzaSyncResult> {
  if (!isRayzaEnabled() || !bookable(record) || record.source === "demo") return { ok: true, skipped: true };
  const previous = (await getSyncRows([record.id])).get(record.id);
  // Never sent and not a linked room type: RAYZA can't have it.
  if (!previous && !(await getRayzaRoomLinks())[record.roomId!]) return { ok: true, skipped: true };
  const refs = previous?.refs.length
    ? previous.refs
    : [...new Set([...rayzaReferences(record), legacyRayzaReference(record)])];

  for (const ref of refs) {
    const result = await cancelRayzaBooking(ref);
    if (!result.ok) {
      const row = await saveSyncRow(
        { reservationId: record.id, state: "failed", wanted: "cancelled", refs, code: result.code, error: result.error },
        previous,
      );
      await noteFailure(record, row, previous);
      log.error("RAYZA cancel failed", { reservation_id: record.id, ref, code: result.code, error: result.error });
      await recordOpsError("rayza", "RAYZA cancel failed", { reservation_id: record.id, code: result.code, error: result.error });
      return { ok: false, code: result.code, error: result.error };
    }
  }
  log.info("Booking released on RAYZA", { reservation_id: record.id, refs });
  await saveSyncRow({ reservationId: record.id, state: "cancelled", wanted: "cancelled", refs }, previous);
  return { ok: true, refs };
}

/**
 * For confirmation paths with no staff screen waiting (payments): push the
 * booking and log a failure. The result lets the caller tell the guest and
 * the manager when RAYZA turned a paid booking down.
 */
export async function syncConfirmedReservationToRayza(record: ReservationRecord): Promise<RayzaSyncResult> {
  if (!isRayzaEnabled() || record.status !== "confirmed") return { ok: true, skipped: true };
  const result = await pushReservationToRayza(record);
  if (!result.ok) log.warning("Push failed", { reservation_id: record.id, code: result.code, error: result.error });
  return result;
}

/** Cancel every given line on RAYZA, logging failures (they are retried by the scheduled sync). */
export async function syncCancelledReservationsToRayza(records: ReservationRecord[]): Promise<void> {
  if (!isRayzaEnabled()) return;
  for (const record of records) {
    const result = await cancelReservationOnRayza(record);
    if (!result.ok) log.warning("Cancel failed", { reservation_id: record.id, code: result.code, error: result.error });
  }
}

// ─── Scheduled reconcile ─────────────────────────────────────────────────

const MAX_AUTO_ATTEMPTS = 8;
const RUN_BUDGET_MS = 18_000;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export type ReconcileSummary = { pushed: number; cancelled: number; failed: number; pending: number };

/**
 * Bring RAYZA in line with Relief: upcoming confirmed bookings pushed,
 * cancelled ones released. RAYZA ignores repeats, so this is safe to run
 * as often as needed; `retryAll` also retries bookings that kept failing.
 */
export async function reconcileRayza(options: { retryAll?: boolean } = {}): Promise<ReconcileSummary | null> {
  if (!isRayzaEnabled()) return null;
  const started = Date.now();
  const today = ymd(new Date());
  const from = ymd(new Date(Date.now() - 30 * 86_400_000));
  const to = ymd(new Date(Date.now() + 400 * 86_400_000));
  const { links, since } = await getLinkDoc();
  const reservations = (await listReservationsForReport(from, to)).filter(
    (r) => bookable(r) && r.checkOut! > today && r.source !== "demo" && links[r.roomId!],
  );
  const rows = await getSyncRows(reservations.map((r) => r.id));
  const summary: ReconcileSummary = { pushed: 0, cancelled: 0, failed: 0, pending: 0 };

  for (const r of reservations) {
    const row = rows.get(r.id);
    let op: "push" | "cancel" | null = null;
    // In-house stays are the front desk's; only arrivals from today on are pushed. Bookings
    // made before the room type was linked are left alone unless a push was already tried.
    const madeAfterLinking = r.createdAt >= (since[r.roomId!] ?? "");
    if (r.status === "confirmed" && r.checkIn! >= today && row?.state !== "pushed" && (row || madeAfterLinking)) op = "push";
    if (r.status === "cancelled" && row && row.state !== "cancelled") op = "cancel";
    if (!op) continue;
    if (row?.state === "failed" && row.attempts >= MAX_AUTO_ATTEMPTS && !options.retryAll) {
      summary.failed++;
      continue;
    }
    if (Date.now() - started > RUN_BUDGET_MS) {
      summary.pending++;
      continue;
    }
    const result = op === "push" ? await pushReservationToRayza(r) : await cancelReservationOnRayza(r);
    if (!result.ok) summary.failed++;
    else if (op === "push") summary.pushed++;
    else summary.cancelled++;
  }
  log.info("RAYZA reconcile finished", { ...summary, duration_s: Math.round((Date.now() - started) / 1000) });
  return summary;
}

// ─── Staff overview ──────────────────────────────────────────────────────

export async function rayzaOverview(): Promise<{
  enabled: boolean;
  links: RayzaRoomLinks;
  relief: { roomId: string; name: string }[];
  catalogue: RayzaCatalogue | null;
  error?: string;
  recent: RayzaSyncRow[];
}> {
  const links = await getRayzaRoomLinks();
  const relief = rooms.map((room) => ({ roomId: room.id, name: roomDisplayName(room.id) }));
  if (!isRayzaEnabled()) return { enabled: false, links, relief, catalogue: null, recent: [] };
  const [all, recent] = await Promise.all([catalogue(undefined, true), recentSyncRows()]);
  return all.ok
    ? { enabled: true, links, relief, catalogue: all.catalogue, recent }
    : { enabled: true, links, relief, catalogue: null, error: all.error, recent };
}
