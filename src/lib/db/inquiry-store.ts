import { getSupabaseAdmin } from "@/lib/db/client";
import type {
  DiningReservation,
  EventInquiry,
  GuestFeedback,
} from "@/lib/inquiry-store";

type EventRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  event_type: string;
  event_date: string;
  guest_count: string;
  message: string;
  created_at: string;
};

type DiningRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  venue: string;
  reservation_date: string;
  reservation_time: string;
  party_size: string;
  notes: string | null;
  created_at: string;
};

type FeedbackRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
};

function mapEvent(row: EventRow): EventInquiry {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    eventType: row.event_type,
    eventDate: row.event_date,
    guestCount: row.guest_count,
    message: row.message,
    createdAt: row.created_at,
  };
}

function mapDining(row: DiningRow): DiningReservation {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    venue: row.venue,
    reservationDate: row.reservation_date,
    reservationTime: row.reservation_time,
    partySize: row.party_size,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function mapFeedback(row: FeedbackRow): GuestFeedback {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? undefined,
    message: row.message,
    createdAt: row.created_at,
  };
}

export async function dbAddEventInquiry(
  data: Omit<EventInquiry, "id" | "createdAt">,
): Promise<EventInquiry> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: row, error } = await supabase
    .from("event_inquiries")
    .insert({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      event_type: data.eventType,
      event_date: data.eventDate,
      guest_count: data.guestCount,
      message: data.message,
    })
    .select()
    .single();

  if (error || !row) throw new Error(error?.message ?? "Insert event inquiry failed");
  return mapEvent(row as EventRow);
}

export async function dbAddDiningReservation(
  data: Omit<DiningReservation, "id" | "createdAt">,
): Promise<DiningReservation> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: row, error } = await supabase
    .from("dining_reservations")
    .insert({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      venue: data.venue,
      reservation_date: data.reservationDate,
      reservation_time: data.reservationTime,
      party_size: data.partySize,
      notes: data.notes ?? null,
    })
    .select()
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? "Insert dining reservation failed");
  }
  return mapDining(row as DiningRow);
}

export async function dbGetEventInquiries(): Promise<EventInquiry[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("event_inquiries")
    .select()
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data as EventRow[]).map(mapEvent);
}

export async function dbAddGuestFeedback(
  data: Omit<GuestFeedback, "id" | "createdAt">,
): Promise<GuestFeedback> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: row, error } = await supabase
    .from("guest_feedback")
    .insert({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone ?? null,
      message: data.message,
    })
    .select()
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? "Insert guest feedback failed");
  }
  return mapFeedback(row as FeedbackRow);
}

export async function dbGetGuestFeedback(): Promise<GuestFeedback[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("guest_feedback")
    .select()
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data as FeedbackRow[]).map(mapFeedback);
}
