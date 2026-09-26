import {
  dbAddDiningReservation,
  dbAddEventInquiry,
} from "@/lib/db/inquiry-store";
import { isSupabaseEnabled } from "@/lib/db/client";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";
import { randomUUID } from "crypto";
import path from "path";

export type EventInquiry = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  guestCount: string;
  message: string;
  createdAt: string;
};

export type DiningReservation = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  venue: string;
  reservationDate: string;
  reservationTime: string;
  partySize: string;
  notes?: string;
  createdAt: string;
};

export type GuestFeedback = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: string;
};

type InquiryStore = {
  eventInquiries: EventInquiry[];
  diningReservations: DiningReservation[];
  guestFeedback: GuestFeedback[];
};

const STORE_FILE = path.join(process.cwd(), "data", "inquiries.json");

const emptyStore = (): InquiryStore => ({
  eventInquiries: [],
  diningReservations: [],
  guestFeedback: [],
});

function normalizeStore(store: InquiryStore): InquiryStore {
  store.eventInquiries ??= [];
  store.diningReservations ??= [];
  store.guestFeedback ??= [];
  return store;
}

async function readStore(): Promise<InquiryStore> {
  return normalizeStore(await readJsonFile(STORE_FILE, emptyStore));
}

function updateStore<R>(fn: (store: InquiryStore) => R): Promise<R> {
  return updateJsonFile(STORE_FILE, emptyStore, (store) => fn(normalizeStore(store)));
}

export async function addEventInquiry(
  data: Omit<EventInquiry, "id" | "createdAt">,
): Promise<EventInquiry> {
  if (isSupabaseEnabled()) return dbAddEventInquiry(data);

  return updateStore((store) => {
    const record: EventInquiry = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    store.eventInquiries.unshift(record);
    return record;
  });
}

export async function addDiningReservation(
  data: Omit<DiningReservation, "id" | "createdAt">,
): Promise<DiningReservation> {
  if (isSupabaseEnabled()) return dbAddDiningReservation(data);

  return updateStore((store) => {
    const record: DiningReservation = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    store.diningReservations.unshift(record);
    return record;
  });
}

export async function getEventInquiries(): Promise<EventInquiry[]> {
  if (isSupabaseEnabled()) {
    const { dbGetEventInquiries } = await import("@/lib/db/inquiry-store");
    return dbGetEventInquiries();
  }

  const store = await readStore();
  return store.eventInquiries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function addGuestFeedback(
  data: Omit<GuestFeedback, "id" | "createdAt">,
): Promise<GuestFeedback> {
  if (isSupabaseEnabled()) {
    const { dbAddGuestFeedback } = await import("@/lib/db/inquiry-store");
    return dbAddGuestFeedback(data);
  }

  return updateStore((store) => {
    const record: GuestFeedback = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    store.guestFeedback.unshift(record);
    return record;
  });
}

export async function getGuestFeedback(): Promise<GuestFeedback[]> {
  if (isSupabaseEnabled()) {
    const { dbGetGuestFeedback } = await import("@/lib/db/inquiry-store");
    return dbGetGuestFeedback();
  }

  const store = await readStore();
  return store.guestFeedback.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
