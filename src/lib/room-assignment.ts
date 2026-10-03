/**
 * Physical room assignment (Room 101) for room bookings. Unit ids are
 * `${roomId}-${n}` following room setup; labels come from room setup.
 *
 * New bookings are auto-assigned with Sirvoy's "minimise gaps" rule: prefer
 * the free room whose neighbouring stays sit closest to this one, so empty
 * nights cluster and longer stays still fit. Staff can move guests; a move is
 * refused if another active booking already has that room on those nights.
 */

import {
  findReservationById,
  listOverlappingRoomReservations,
  updateReservationById,
  type ReservationRecord,
} from "@/lib/demo-store";
import { parseDateString } from "@/lib/booking-search";
import { getRoomSetup, unitIdsFor } from "@/lib/room-setup";

export type Occupancy = { unitId: string; checkIn: string; checkOut: string };

const DAY = 86_400_000;

function days(from: string, to: string): number {
  return Math.round((parseDateString(to).getTime() - parseDateString(from).getTime()) / DAY);
}

/** Rooms of `unitIds` with no assigned stay overlapping [checkIn, checkOut). */
export function freeUnits(
  unitIds: string[],
  occupied: Occupancy[],
  checkIn: string,
  checkOut: string,
): string[] {
  return unitIds.filter(
    (unitId) =>
      !occupied.some((o) => o.unitId === unitId && o.checkIn < checkOut && o.checkOut > checkIn),
  );
}

/**
 * Picks `count` free rooms, tightest fit first: the score is the smaller of
 * the empty nights before and after this stay on that room (0 = back to back).
 * Rooms with no neighbouring stays score worst; ties go to the lower number.
 */
export function pickUnitsMinimizingGaps(
  unitIds: string[],
  occupied: Occupancy[],
  checkIn: string,
  checkOut: string,
  count: number,
): string[] | null {
  const free = freeUnits(unitIds, occupied, checkIn, checkOut);
  if (free.length < count) return null;
  const score = (unitId: string) => {
    const mine = occupied.filter((o) => o.unitId === unitId);
    const before = mine.filter((o) => o.checkOut <= checkIn).map((o) => days(o.checkOut, checkIn));
    const after = mine.filter((o) => o.checkIn >= checkOut).map((o) => days(checkOut, o.checkIn));
    const gaps = [...before, ...after];
    return gaps.length ? Math.min(...gaps) : Number.POSITIVE_INFINITY;
  };
  return free
    .map((unitId, index) => ({ unitId, index, gap: score(unitId) }))
    .sort((a, b) => a.gap - b.gap || a.index - b.index)
    .slice(0, count)
    .map((c) => c.unitId);
}

function occupancyOf(reservations: ReservationRecord[], excludeId?: string): Occupancy[] {
  return reservations
    .filter((r) => r.id !== excludeId && r.checkIn && r.checkOut)
    .flatMap((r) =>
      (r.assignedUnits ?? []).map((unitId) => ({
        unitId,
        checkIn: r.checkIn!,
        checkOut: r.checkOut!,
      })),
    );
}

export type AssignmentOptions = {
  /** All rooms of this type with their numbers, and which are free for this stay. */
  rooms: { unitId: string; label: string; free: boolean }[];
  current: string[];
  units: number;
};

async function roomUnits(roomId: string) {
  const setup = await getRoomSetup();
  const room = setup.rooms.find((r) => r.roomId === roomId);
  if (!room) return null;
  const ids = unitIdsFor(room);
  return { ids, labels: Object.fromEntries(ids.map((id, i) => [id, room.unitLabels[i]])) };
}

/** Wider window than the stay, so the gap rule can see neighbouring bookings. */
function neighbourhood(checkIn: string, checkOut: string) {
  const from = new Date(parseDateString(checkIn).getTime() - 30 * DAY).toISOString().slice(0, 10);
  const to = new Date(parseDateString(checkOut).getTime() + 30 * DAY).toISOString().slice(0, 10);
  return { from, to };
}

export async function getAssignmentOptions(
  reservation: ReservationRecord,
): Promise<AssignmentOptions | null> {
  if (reservation.itemType !== "room" || !reservation.roomId || !reservation.checkIn || !reservation.checkOut) {
    return null;
  }
  const units = await roomUnits(reservation.roomId);
  if (!units) return null;
  const others = await listOverlappingRoomReservations(
    reservation.roomId,
    reservation.checkIn,
    reservation.checkOut,
  );
  const free = new Set(
    freeUnits(units.ids, occupancyOf(others, reservation.id), reservation.checkIn, reservation.checkOut),
  );
  return {
    rooms: units.ids.map((unitId) => ({
      unitId,
      label: units.labels[unitId],
      free: free.has(unitId) || (reservation.assignedUnits ?? []).includes(unitId),
    })),
    current: reservation.assignedUnits ?? [],
    units: reservation.units ?? 1,
  };
}

export type AssignResult =
  | { ok: true; reservation: ReservationRecord }
  | { ok: false; status: 404 | 409 | 422; error: string };

/** Staff move: exactly one free room of the booking's type per booked room. */
export async function assignRooms(reservationId: string, unitIds: string[]): Promise<AssignResult> {
  const reservation = await findReservationById(reservationId);
  if (!reservation) return { ok: false, status: 404, error: "Reservation not found" };
  const options = await getAssignmentOptions(reservation);
  if (!options) return { ok: false, status: 422, error: "This booking has no room type or dates" };

  const unique = [...new Set(unitIds)];
  if (unique.length !== options.units) {
    return { ok: false, status: 422, error: `Choose ${options.units} different room(s)` };
  }
  const byId = new Map(options.rooms.map((r) => [r.unitId, r]));
  const taken = unique.filter((id) => !byId.get(id)?.free);
  if (unique.some((id) => !byId.has(id))) {
    return { ok: false, status: 422, error: "That room is not part of this room type" };
  }
  if (taken.length) {
    const labels = taken.map((id) => byId.get(id)!.label).join(", ");
    return { ok: false, status: 409, error: `Room ${labels} is already taken on these nights` };
  }

  const updated = await updateReservationById(reservationId, { assignedUnits: unique });
  if (!updated) return { ok: false, status: 404, error: "Reservation not found" };
  return { ok: true, reservation: updated };
}

/**
 * Best-effort automatic assignment for a new booking. Re-checks after saving
 * and retries if a concurrent booking grabbed the same room; leaves the
 * booking unassigned (staff can assign) rather than ever failing it.
 */
export async function autoAssignRooms(reservation: ReservationRecord): Promise<ReservationRecord> {
  if (!reservation.roomId || !reservation.checkIn || !reservation.checkOut) return reservation;
  const units = await roomUnits(reservation.roomId);
  if (!units) return reservation;
  const { from, to } = neighbourhood(reservation.checkIn, reservation.checkOut);

  for (let attempt = 0; attempt < 3; attempt++) {
    const others = await listOverlappingRoomReservations(reservation.roomId, from, to);
    const occupied = occupancyOf(others, reservation.id);
    const picked = pickUnitsMinimizingGaps(
      units.ids,
      occupied,
      reservation.checkIn,
      reservation.checkOut,
      reservation.units ?? 1,
    );
    if (!picked) return reservation;

    const saved = (await updateReservationById(reservation.id, { assignedUnits: picked })) ?? reservation;
    const clash = (await listOverlappingRoomReservations(reservation.roomId, reservation.checkIn, reservation.checkOut))
      .filter((r) => r.id !== reservation.id && r.createdAt <= saved.createdAt)
      .some((r) => (r.assignedUnits ?? []).some((u) => picked.includes(u)));
    if (!clash) return saved;
  }
  return reservation;
}
