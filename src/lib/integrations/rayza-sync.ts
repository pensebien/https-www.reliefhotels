/**
 * RAYZA HMS sync: which Relief room type is which RAYZA room type, live
 * availability from RAYZA, pushing/cancelling/moving bookings, and the
 * per-reservation sync status staff see and the scheduled job retries.
 *
 * Relief stays the guest-facing booking engine; RAYZA holds the hotel's
 * whole house (front-desk bookings, HMS blocks). A room sells online only
 * when both have it free.
 */

import { rooms } from "@/content/site";
import { dataPath } from "@/lib/data-dir";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import {
  findPaymentByReference,
  listGroupMembers,
  listPaymentsForReservation,
  listReservationsForReport,
  updateReservationById,
  type ReservationRecord,
} from "@/lib/demo-store";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";
import { getRateConfig } from "@/lib/booking-engine/rate-config";
import { getRoomSetup, saveRoomSetup, unitLabelMap } from "@/lib/room-setup";
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
  updateRayzaBooking,
  type RayzaCatalogue,
} from "./rayza-connect";

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

export type RayzaRoomCheck = { free: number; maxOccupancy: number; reason?: string };

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
      checks[roomId] = { free: 0, maxOccupancy: 0, reason: `RAYZA no longer has the room type "${typeId}"` };
    } else if (type.closedToArrival) {
      checks[roomId] = { free: 0, maxOccupancy: type.maxOccupancy, reason: "Arrivals are closed on this date" };
    } else if (type.closedToDeparture) {
      checks[roomId] = { free: 0, maxOccupancy: type.maxOccupancy, reason: "Departures are closed on this date" };
    } else if (nights < type.minLos) {
      checks[roomId] = { free: 0, maxOccupancy: type.maxOccupancy, reason: `Minimum stay is ${type.minLos} nights` };
    } else {
      checks[roomId] = { free: type.availableCount, maxOccupancy: type.maxOccupancy };
    }
  }
  return checks;
}

/**
 * Live RAYZA availability for linked room types, or null when RAYZA is off,
 * nothing is linked, or RAYZA can't be reached — then Relief's own inventory
 * decides alone (RAYZA still re-checks when the booking is pushed).
 * `fresh` skips the 30-second cache; the booking write path uses it.
 */
export async function rayzaAvailability(
  checkIn: string,
  checkOut: string,
  nights: number,
  fresh = false,
): Promise<Record<string, RayzaRoomCheck> | null> {
  if (!isRayzaEnabled()) return null;
  const links = await getRayzaRoomLinks();
  if (Object.keys(links).length === 0) return null;
  const result = await catalogue({ checkIn, checkOut }, fresh);
  if (!result.ok) {
    console.warn("[rayza] availability unavailable, using Relief inventory only:", result.error);
    return null;
  }
  return rayzaChecksFrom(result.catalogue, links, nights);
}

/** Why RAYZA can't take these rooms (sold out, rules, too many guests), or null. */
export async function rayzaRejection(
  lines: { roomId: string; rooms: number; guests: number }[],
  checkIn: string,
  checkOut: string,
  nights: number,
): Promise<string | null> {
  const checks = await rayzaAvailability(checkIn, checkOut, nights, true);
  if (!checks) return null;
  for (const line of lines) {
    const check = checks[line.roomId];
    if (!check) continue;
    if (check.reason) return check.reason;
    if (check.free < line.rooms) return "This room is no longer available for these dates. Please change your rooms or dates.";
    if (Math.ceil(line.guests / Math.max(1, line.rooms)) > check.maxOccupancy) {
      return `This room sleeps up to ${check.maxOccupancy} guests per room`;
    }
  }
  return null;
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
      console.error("[rayza] could not read sync status:", error.message);
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
  if (error) console.error("[rayza] could not record sync status:", error.message);
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
  const own = payments.filter((p) => p.status === "success").reduce((sum, p) => sum + p.amountKobo / 100, 0);
  // A group's one payment sits on the lead line; each line counts its own deposit share.
  if (record.groupId) {
    const paid = own > 0 || (record.paymentReference && (await findPaymentByReference(record.paymentReference))?.status === "success");
    return paid ? (record.quotedDepositNgn ?? 0) : 0;
  }
  return own;
}

/** Room numbers to send, one per unit — only ones RAYZA knows for that room type. */
async function roomNumbersFor(record: ReservationRecord, typeId: string): Promise<(string | undefined)[]> {
  if (!record.assignedUnits?.length) return [];
  const [setup, all] = await Promise.all([getRoomSetup(), catalogue()]);
  const known = new Set(all.ok ? (all.catalogue.rooms.find((r) => r.id === typeId)?.roomNumbers ?? []) : []);
  const labels = unitLabelMap(setup);
  return record.assignedUnits.map((unit) => {
    const label = labels[unit];
    return label && known.has(label) ? label : undefined;
  });
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
    return { ok: false, code, error };
  };

  if ((record.phone?.trim().length ?? 0) < 7) return fail("MISSING_PHONE", "RAYZA needs the guest's phone number");

  const [paid, roomNumbers] = await Promise.all([paidNgn(record), roomNumbersFor(record, typeId)]);
  const bodies = buildBookingBodies(record, {
    roomType: typeId,
    roomNumbers,
    paidNgn: paid,
    isTest: process.env.DEMO_MODE === "true",
  });

  const refs: string[] = [];
  for (const body of bodies) {
    let result = await createRayzaBooking(body);
    // The assigned room was taken on RAYZA's side — let RAYZA pick another of the type.
    if (!result.ok && result.status === 409 && body.room_number) {
      result = await createRayzaBooking({ ...body, room_number: undefined });
    }
    if (!result.ok) return fail(result.code, result.error, refs);
    if (result.reference !== body.booking_reference) {
      console.warn("[rayza] RAYZA stored a different reference", body.booking_reference, "→", result.reference);
    }
    refs.push(result.reference);
  }
  await saveSyncRow({ reservationId: record.id, state: "pushed", wanted: "booked", refs }, previous);
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
      return { ok: false, code: result.code, error: result.error };
    }
  }
  await saveSyncRow({ reservationId: record.id, state: "cancelled", wanted: "cancelled", refs }, previous);
  return { ok: true, refs };
}

/** After staff assign or move rooms: tell RAYZA the room numbers (or push if it never got the booking). */
export async function updateRoomsOnRayza(record: ReservationRecord): Promise<RayzaSyncResult> {
  if (!isRayzaEnabled() || !bookable(record) || record.status !== "confirmed") return { ok: true, skipped: true };
  const previous = (await getSyncRows([record.id])).get(record.id);
  if (previous?.state !== "pushed") return pushReservationToRayza(record);
  const typeId = (await getRayzaRoomLinks())[record.roomId!];
  if (!typeId) return { ok: true, skipped: true };
  const numbers = await roomNumbersFor(record, typeId);
  for (const [i, ref] of previous.refs.entries()) {
    if (!numbers[i]) continue;
    const result = await updateRayzaBooking(ref, { room_number: numbers[i] });
    if (!result.ok) {
      // Not fatal: the booking still holds a room of the right type on RAYZA.
      console.warn("[rayza] room move not applied", ref, result.error);
      return { ok: false, code: result.code, error: result.error };
    }
  }
  return { ok: true, refs: previous.refs };
}

/**
 * For confirmation paths with no staff screen waiting (payments, cashier,
 * walk-ins): push every confirmed line of the booking, log failures.
 */
export async function syncConfirmedReservationToRayza(record: ReservationRecord): Promise<void> {
  if (!isRayzaEnabled()) return;
  const lines = (await listGroupMembers(record)).filter((m) => m.status === "confirmed");
  for (const line of lines.length ? lines : [record]) {
    const result = await pushReservationToRayza(line);
    if (!result.ok) console.warn("[rayza] push failed for reservation", line.id, result.error);
  }
}

/** Cancel every given line on RAYZA, logging failures (they are retried by the scheduled sync). */
export async function syncCancelledReservationsToRayza(records: ReservationRecord[]): Promise<void> {
  if (!isRayzaEnabled()) return;
  for (const record of records) {
    const result = await cancelReservationOnRayza(record);
    if (!result.ok) console.warn("[rayza] cancel failed for reservation", record.id, result.error);
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
  return summary;
}

// ─── Inventory from RAYZA ────────────────────────────────────────────────

/**
 * Copy RAYZA's room numbers (and so the room count) into Relief's room setup
 * for the linked room types. Unit slots keep their position, so existing room
 * assignments carry over to the new numbers.
 */
export async function importRayzaRoomNumbers(roomIds: string[]): Promise<{ updated: string[] }> {
  const [links, all, setup] = await Promise.all([getRayzaRoomLinks(), catalogue(undefined, true), getRoomSetup()]);
  if (!all.ok) throw new Error(all.error);
  const updated: string[] = [];
  const next = setup.rooms.map((room) => {
    const type = roomIds.includes(room.roomId) && links[room.roomId]
      ? all.catalogue.rooms.find((t) => t.id === links[room.roomId])
      : undefined;
    if (!type) return room;
    if (type.roomNumbers.length !== type.totalRooms) {
      throw new Error(
        `RAYZA lists ${type.totalRooms} ${type.name} rooms but only shows numbers for ${type.roomNumbers.length}. Check the rooms in RAYZA, then try again.`,
      );
    }
    updated.push(room.roomId);
    return { ...room, inventory: type.roomNumbers.length, unitLabels: type.roomNumbers };
  });
  await saveRoomSetup({ rooms: next });
  return { updated };
}

export type ReliefRoomSummary = { roomId: string; inventory: number; unitLabels: string[]; maxGuests: number; priceNgn: number };

export async function rayzaOverview(): Promise<{
  enabled: boolean;
  links: RayzaRoomLinks;
  relief: ReliefRoomSummary[];
  catalogue: RayzaCatalogue | null;
  error?: string;
  recent: RayzaSyncRow[];
}> {
  const [links, setup, rates] = await Promise.all([getRayzaRoomLinks(), getRoomSetup(), getRateConfig()]);
  const relief = setup.rooms.map((room) => {
    const policy = rates.rooms.find((r) => r.roomId === room.roomId);
    return {
      roomId: room.roomId,
      inventory: room.inventory,
      unitLabels: room.unitLabels,
      maxGuests: policy?.maxGuestsPerUnit ?? 2,
      priceNgn: policy?.baseNightlyNgn ?? 0,
    };
  });
  if (!isRayzaEnabled()) return { enabled: false, links, relief, catalogue: null, recent: [] };
  const [all, recent] = await Promise.all([catalogue(undefined, true), recentSyncRows()]);
  return all.ok
    ? { enabled: true, links, relief, catalogue: all.catalogue, recent }
    : { enabled: true, links, relief, catalogue: null, error: all.error, recent };
}
