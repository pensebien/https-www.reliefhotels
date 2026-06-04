import {
  dbAddDiningReservation,
  dbAddEventInquiry,
} from "@/lib/db/inquiry-store";
import { isSupabaseEnabled } from "@/lib/db/client";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
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

type InquiryStore = {
  eventInquiries: EventInquiry[];
  diningReservations: DiningReservation[];
};

const STORE_FILE = path.join(process.cwd(), "data", "inquiries.json");

async function readStore(): Promise<InquiryStore> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    return JSON.parse(raw) as InquiryStore;
  } catch {
    return { eventInquiries: [], diningReservations: [] };
  }
}

async function writeStore(store: InquiryStore): Promise<void> {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export async function addEventInquiry(
  data: Omit<EventInquiry, "id" | "createdAt">,
): Promise<EventInquiry> {
  if (isSupabaseEnabled()) return dbAddEventInquiry(data);

  const store = await readStore();
  const record: EventInquiry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  store.eventInquiries.unshift(record);
  await writeStore(store);
  return record;
}

export async function addDiningReservation(
  data: Omit<DiningReservation, "id" | "createdAt">,
): Promise<DiningReservation> {
  if (isSupabaseEnabled()) return dbAddDiningReservation(data);

  const store = await readStore();
  const record: DiningReservation = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  store.diningReservations.unshift(record);
  await writeStore(store);
  return record;
}
