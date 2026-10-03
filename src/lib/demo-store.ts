import { dataPath } from "@/lib/data-dir";
import { demoPayments, demoReservations } from "@/content/demo-data";
import {
  dbAddPayment,
  dbAddReservation,
  dbFindPaymentByReference,
  dbFindReservationById,
  dbGetBookingActivity,
  dbFindPendingRefund,
  dbListPaymentsForReport,
  dbListReservationsForReport,
  dbListReservationsByGroup,
  dbListOverlappingRoomReservations,
  dbListPaymentsForReservation,
  dbUpdatePaymentByReference,
  dbUpdateReservationById,
} from "@/lib/db/booking-store";
import type { StayQuote } from "@/lib/booking-engine/quote";
import { isSupabaseEnabled } from "@/lib/db/client";
import type {
  FrontDeskPaymentMethod,
  PaymentChannel,
} from "@/lib/payment-methods";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";
import { randomUUID } from "crypto";
import path from "path";

export type ReservationRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  itemType: "room" | "tour" | "inquiry";
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  guests: number;
  stayPreference: string;
  message: string;
  status: "pending" | "confirmed" | "cancelled" | "checked_out";
  paymentReference?: string;
  staffNotes?: string;
  source: "live" | "demo";
  createdAt: string;
  emailSent: boolean;
  /** Rooms of this type in one booking (booking engine); absent = 1. */
  units?: number;
  couponCode?: string;
  extraIds?: string[];
  /** Price locked at booking time — payments never re-derive it from today's rates. */
  quotedTotalNgn?: number;
  quotedDepositNgn?: number;
  /** Unpaid online bookings stop holding the room after this instant. */
  holdExpiresAt?: string;
  cancelledAt?: string;
  /** Physical rooms assigned, e.g. ["guest-room-3"] — one per unit (room setup numbering). */
  assignedUnits?: string[];
  /** Full price breakdown locked at booking — invoice lines come from this. */
  quoteSnapshot?: StayQuote;
  /** Shared by the room-type lines of one group booking; equals the lead line's id. */
  groupId?: string;
  /** Where the booking was made; older bookings are inferred (see bookingChannelOf). */
  bookingChannel?: "online" | "desk";
};

/** Online vs front desk, inferring older bookings from the walk-in note. */
export function bookingChannelOf(r: ReservationRecord): "online" | "desk" {
  if (r.bookingChannel) return r.bookingChannel;
  return r.message.startsWith("Walk-in booking") ? "desk" : "online";
}

export type NewReservation = Omit<
  ReservationRecord,
  "id" | "source" | "createdAt" | "status"
> & {
  status?: ReservationRecord["status"];
};

/**
 * Whether a reservation takes a room out of inventory at `now`: anything not
 * cancelled, except an unpaid online booking whose payment hold has lapsed.
 * Mirrored in SQL by reserve_room() and countOccupiedUnitsByRoom().
 */
export function holdsInventory(r: ReservationRecord, now = Date.now()): boolean {
  if (r.status === "cancelled") return false;
  if (r.status === "pending" && r.holdExpiresAt) {
    return new Date(r.holdExpiresAt).getTime() > now;
  }
  return true;
}

export type PaymentRecord = {
  id: string;
  reference: string;
  reservationId?: string;
  email: string;
  amountKobo: number;
  currency: string;
  status: "pending" | "success" | "failed" | "abandoned";
  itemType: "room" | "tour";
  itemId: string;
  itemLabel: string;
  paymentMethod?: FrontDeskPaymentMethod | "paystack";
  paymentChannel?: PaymentChannel;
  externalReference?: string;
  source: "live" | "demo";
  createdAt: string;
};

type Store = {
  reservations: ReservationRecord[];
  payments: PaymentRecord[];
};

const STORE_DIR = dataPath();
const STORE_FILE = path.join(STORE_DIR, "demo-store.json");

const emptyStore = (): Store => ({ reservations: [], payments: [] });

function readStore(): Promise<Store> {
  return readJsonFile(STORE_FILE, emptyStore);
}

function updateStore<R>(fn: (store: Store) => R): Promise<R> {
  return updateJsonFile(STORE_FILE, emptyStore, fn);
}

function newRecord(data: NewReservation): ReservationRecord {
  return {
    id: randomUUID(),
    source: "live",
    status: data.status ?? "pending",
    createdAt: new Date().toISOString(),
    ...data,
  };
}

async function fileAddReservation(data: NewReservation): Promise<ReservationRecord> {
  return updateStore((store) => {
    const record = newRecord(data);
    store.reservations.unshift(record);
    return record;
  });
}

/**
 * File-mode check-and-insert under the store's per-file lock, so two
 * concurrent bookings can't both take the last room. `canAdd` sees every
 * reservation (live + seeded demo). Supabase mode uses reserve_room() instead.
 */
export async function fileAddReservationIf(
  data: NewReservation,
  canAdd: (existing: ReservationRecord[]) => boolean,
): Promise<ReservationRecord | null> {
  return updateStore((store) => {
    if (!canAdd([...store.reservations, ...demoReservations])) return null;
    const record = newRecord(data);
    store.reservations.unshift(record);
    return record;
  });
}

async function fileUpdateReservationById(
  id: string,
  patch: Partial<ReservationRecord>,
): Promise<ReservationRecord | null> {
  return updateStore((store) => {
    const index = store.reservations.findIndex((r) => r.id === id);
    if (index === -1) return null;
    store.reservations[index] = { ...store.reservations[index], ...patch };
    return store.reservations[index];
  });
}

async function fileFindReservationById(
  id: string,
): Promise<ReservationRecord | undefined> {
  const store = await readStore();
  const live = store.reservations.find((r) => r.id === id);
  if (live) return live;
  return demoReservations.find((r) => r.id === id);
}

async function fileAddPayment(
  data: Omit<PaymentRecord, "id" | "source" | "createdAt">,
): Promise<PaymentRecord> {
  return updateStore((store) => {
    const existing = store.payments.find((p) => p.reference === data.reference);
    if (existing) return existing;

    const record: PaymentRecord = {
      id: randomUUID(),
      source: "live",
      createdAt: new Date().toISOString(),
      ...data,
    };
    store.payments.unshift(record);
    return record;
  });
}

export async function addReservation(
  data: NewReservation,
): Promise<ReservationRecord> {
  if (isSupabaseEnabled()) return dbAddReservation(data);
  return fileAddReservation(data);
}

export async function updateReservationById(
  id: string,
  patch: Partial<ReservationRecord>,
): Promise<ReservationRecord | null> {
  if (isSupabaseEnabled()) return dbUpdateReservationById(id, patch);
  return fileUpdateReservationById(id, patch);
}

export async function findReservationById(
  id: string,
): Promise<ReservationRecord | undefined> {
  if (isSupabaseEnabled()) {
    const live = await dbFindReservationById(id);
    if (live) return live;
    return demoReservations.find((r) => r.id === id);
  }
  return fileFindReservationById(id);
}

export async function addPayment(
  data: Omit<PaymentRecord, "id" | "source" | "createdAt">,
): Promise<PaymentRecord> {
  if (isSupabaseEnabled()) return dbAddPayment(data);
  return fileAddPayment(data);
}

export async function updatePaymentByReference(
  reference: string,
  patch: Partial<PaymentRecord>,
): Promise<PaymentRecord | null> {
  if (isSupabaseEnabled()) {
    return dbUpdatePaymentByReference(reference, patch);
  }

  return updateStore((store) => {
    const index = store.payments.findIndex((p) => p.reference === reference);
    if (index === -1) return null;
    store.payments[index] = { ...store.payments[index], ...patch };
    return store.payments[index];
  });
}

/**
 * Room reservations of one type overlapping [checkIn, checkOut) that still
 * hold inventory — the set room assignment must not clash with. Uncapped,
 * unlike getActivity().
 */
export async function listOverlappingRoomReservations(
  roomId: string,
  checkIn: string,
  checkOut: string,
): Promise<ReservationRecord[]> {
  const all = isSupabaseEnabled()
    ? await dbListOverlappingRoomReservations(roomId, checkIn, checkOut)
    : (await getActivity()).reservations.filter(
        (r) =>
          r.itemType === "room" &&
          r.roomId === roomId &&
          r.checkIn &&
          r.checkOut &&
          r.checkIn < checkOut &&
          r.checkOut > checkIn,
      );
  const now = Date.now();
  return all.filter((r) => holdsInventory(r, now));
}

/**
 * Every line of the reservation's group booking, lead (oldest) first; just
 * the reservation itself when it isn't part of a group.
 */
export async function listGroupMembers(reservation: ReservationRecord): Promise<ReservationRecord[]> {
  if (!reservation.groupId) return [reservation];
  const members = isSupabaseEnabled()
    ? await dbListReservationsByGroup(reservation.groupId)
    : (await getActivity()).reservations.filter((r) => r.groupId === reservation.groupId);
  // The lead's own id is the group id.
  const leadId = reservation.groupId;
  return members.sort(
    (a, b) =>
      Number(b.id === leadId) - Number(a.id === leadId) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * Room reservations a report over [from, to] needs: stays overlapping the
 * range, plus bookings created or cancelled in it. Uncapped.
 */
export async function listReservationsForReport(from: string, to: string): Promise<ReservationRecord[]> {
  if (isSupabaseEnabled()) return dbListReservationsForReport(from, to);
  const end = nextDay(to);
  const { reservations } = await getActivity();
  return reservations.filter(
    (r) =>
      r.itemType === "room" &&
      ((r.checkIn && r.checkOut && r.checkIn < end && r.checkOut > from) ||
        (r.createdAt.slice(0, 10) >= from && r.createdAt.slice(0, 10) <= to) ||
        (r.cancelledAt && r.cancelledAt.slice(0, 10) >= from && r.cancelledAt.slice(0, 10) <= to)),
  );
}

/** Payments created on days [from, to]. Uncapped. */
export async function listPaymentsForReport(from: string, to: string): Promise<PaymentRecord[]> {
  if (isSupabaseEnabled()) return dbListPaymentsForReport(from, to);
  const { payments } = await getActivity();
  return payments.filter((p) => p.createdAt.slice(0, 10) >= from && p.createdAt.slice(0, 10) <= to);
}

function nextDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** A pending refund row (negative amount) for `transactionReference`. */
export async function findPendingRefund(
  transactionReference: string,
  amountKobo: number,
): Promise<PaymentRecord | undefined> {
  if (isSupabaseEnabled()) return dbFindPendingRefund(transactionReference, amountKobo);
  const { payments } = await getActivity();
  return payments.find(
    (p) =>
      p.externalReference === transactionReference &&
      p.amountKobo === amountKobo &&
      p.status === "pending",
  );
}

/** Successful payments recorded against a reservation (deposit + any balance). */
export async function listPaymentsForReservation(
  reservationId: string,
): Promise<PaymentRecord[]> {
  if (isSupabaseEnabled()) return dbListPaymentsForReservation(reservationId);
  const { payments } = await getActivity();
  return payments.filter((p) => p.reservationId === reservationId);
}

export async function findPaymentByReference(
  reference: string,
): Promise<PaymentRecord | undefined> {
  if (isSupabaseEnabled()) {
    const live = await dbFindPaymentByReference(reference);
    if (live) return live;
    return demoPayments.find((p) => p.reference === reference);
  }

  const store = await readStore();
  const live = store.payments.find((p) => p.reference === reference);
  if (live) return live;
  return demoPayments.find((p) => p.reference === reference);
}

export async function getActivity(): Promise<{
  reservations: ReservationRecord[];
  payments: PaymentRecord[];
}> {
  if (isSupabaseEnabled()) {
    return dbGetBookingActivity();
  }

  const store = await readStore();
  const reservations = [...store.reservations, ...demoReservations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const payments = [...store.payments, ...demoPayments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return { reservations, payments };
}

export function getStorageMode(): "supabase" | "file" {
  return isSupabaseEnabled() ? "supabase" : "file";
}
