import { demoPayments, demoReservations } from "@/content/demo-data";
import {
  dbAddPayment,
  dbAddReservation,
  dbFindPaymentByReference,
  dbGetBookingActivity,
  dbUpdatePaymentByReference,
} from "@/lib/db/booking-store";
import { isSupabaseEnabled } from "@/lib/db/client";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type ReservationRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  stayPreference: string;
  message: string;
  status: "pending" | "confirmed" | "cancelled";
  source: "live" | "demo";
  createdAt: string;
  emailSent: boolean;
};

export type PaymentRecord = {
  id: string;
  reference: string;
  email: string;
  amountKobo: number;
  currency: string;
  status: "pending" | "success" | "failed" | "abandoned";
  itemType: "room" | "tour";
  itemId: string;
  itemLabel: string;
  source: "live" | "demo";
  createdAt: string;
};

type Store = {
  reservations: ReservationRecord[];
  payments: PaymentRecord[];
};

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(STORE_DIR, "demo-store.json");

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    return JSON.parse(raw) as Store;
  } catch {
    const initial: Store = { reservations: [], payments: [] };
    await writeStore(initial);
    return initial;
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function fileAddReservation(
  data: Omit<ReservationRecord, "id" | "source" | "createdAt" | "status"> & {
    status?: ReservationRecord["status"];
  },
): Promise<ReservationRecord> {
  const store = await readStore();
  const record: ReservationRecord = {
    id: randomUUID(),
    source: "live",
    status: data.status ?? "pending",
    createdAt: new Date().toISOString(),
    ...data,
  };
  store.reservations.unshift(record);
  await writeStore(store);
  return record;
}

async function fileAddPayment(
  data: Omit<PaymentRecord, "id" | "source" | "createdAt">,
): Promise<PaymentRecord> {
  const store = await readStore();
  const existing = store.payments.find((p) => p.reference === data.reference);
  if (existing) return existing;

  const record: PaymentRecord = {
    id: randomUUID(),
    source: "live",
    createdAt: new Date().toISOString(),
    ...data,
  };
  store.payments.unshift(record);
  await writeStore(store);
  return record;
}

export async function addReservation(
  data: Omit<ReservationRecord, "id" | "source" | "createdAt" | "status"> & {
    status?: ReservationRecord["status"];
  },
): Promise<ReservationRecord> {
  if (isSupabaseEnabled()) return dbAddReservation(data);
  return fileAddReservation(data);
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

  const store = await readStore();
  const index = store.payments.findIndex((p) => p.reference === reference);
  if (index === -1) return null;
  store.payments[index] = { ...store.payments[index], ...patch };
  await writeStore(store);
  return store.payments[index];
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
    const { reservations, payments } = await dbGetBookingActivity();
    const mergedReservations = [...reservations, ...demoReservations].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const mergedPayments = [...payments, ...demoPayments].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return { reservations: mergedReservations, payments: mergedPayments };
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
