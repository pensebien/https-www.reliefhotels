import { demoPayments, demoReservations } from "@/content/demo-data";
import {
  dbAddPayment,
  dbAddReservation,
  dbFindPaymentByReference,
  dbFindReservationById,
  dbGetBookingActivity,
  dbUpdatePaymentByReference,
  dbUpdateReservationById,
} from "@/lib/db/booking-store";
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
};

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

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(STORE_DIR, "demo-store.json");

const emptyStore = (): Store => ({ reservations: [], payments: [] });

function readStore(): Promise<Store> {
  return readJsonFile(STORE_FILE, emptyStore);
}

function updateStore<R>(fn: (store: Store) => R): Promise<R> {
  return updateJsonFile(STORE_FILE, emptyStore, fn);
}

async function fileAddReservation(
  data: Omit<ReservationRecord, "id" | "source" | "createdAt" | "status"> & {
    status?: ReservationRecord["status"];
  },
): Promise<ReservationRecord> {
  return updateStore((store) => {
    const record: ReservationRecord = {
      id: randomUUID(),
      source: "live",
      status: data.status ?? "pending",
      createdAt: new Date().toISOString(),
      ...data,
    };
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
  data: Omit<ReservationRecord, "id" | "source" | "createdAt" | "status"> & {
    status?: ReservationRecord["status"];
  },
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
