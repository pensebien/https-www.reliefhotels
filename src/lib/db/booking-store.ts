import { getSupabaseAdmin } from "@/lib/db/client";
import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";

type ReservationRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  stay_preference: string;
  message: string;
  status: ReservationRecord["status"];
  source: ReservationRecord["source"];
  email_sent: boolean;
  created_at: string;
};

type PaymentRow = {
  id: string;
  reference: string;
  email: string;
  amount_kobo: number;
  currency: string;
  status: PaymentRecord["status"];
  item_type: PaymentRecord["itemType"];
  item_id: string;
  item_label: string;
  source: PaymentRecord["source"];
  created_at: string;
};

function mapReservation(row: ReservationRow): ReservationRecord {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    stayPreference: row.stay_preference,
    message: row.message,
    status: row.status,
    source: row.source,
    emailSent: row.email_sent,
    createdAt: row.created_at,
  };
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    reference: row.reference,
    email: row.email,
    amountKobo: row.amount_kobo,
    currency: row.currency,
    status: row.status,
    itemType: row.item_type,
    itemId: row.item_id,
    itemLabel: row.item_label,
    source: row.source,
    createdAt: row.created_at,
  };
}

export async function dbAddReservation(
  data: Omit<ReservationRecord, "id" | "source" | "createdAt" | "status"> & {
    status?: ReservationRecord["status"];
  },
): Promise<ReservationRecord> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: row, error } = await supabase
    .from("reservations")
    .insert({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      stay_preference: data.stayPreference,
      message: data.message,
      status: data.status ?? "pending",
      source: "live",
      email_sent: data.emailSent,
    })
    .select()
    .single();

  if (error || !row) throw new Error(error?.message ?? "Insert reservation failed");
  return mapReservation(row as ReservationRow);
}

export async function dbAddPayment(
  data: Omit<PaymentRecord, "id" | "source" | "createdAt">,
): Promise<PaymentRecord> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const existing = await dbFindPaymentByReference(data.reference);
  if (existing) return existing;

  const { data: row, error } = await supabase
    .from("payments")
    .insert({
      reference: data.reference,
      email: data.email,
      amount_kobo: data.amountKobo,
      currency: data.currency,
      status: data.status,
      item_type: data.itemType,
      item_id: data.itemId,
      item_label: data.itemLabel,
      source: "live",
    })
    .select()
    .single();

  if (error || !row) throw new Error(error?.message ?? "Insert payment failed");
  return mapPayment(row as PaymentRow);
}

export async function dbUpdatePaymentByReference(
  reference: string,
  patch: Partial<PaymentRecord>,
): Promise<PaymentRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const update: Record<string, unknown> = {};
  if (patch.status) update.status = patch.status;
  if (patch.email) update.email = patch.email;
  if (patch.amountKobo !== undefined) update.amount_kobo = patch.amountKobo;

  const { data: row, error } = await supabase
    .from("payments")
    .update(update)
    .eq("reference", reference)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;
  return mapPayment(row as PaymentRow);
}

export async function dbFindPaymentByReference(
  reference: string,
): Promise<PaymentRecord | undefined> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: row, error } = await supabase
    .from("payments")
    .select()
    .eq("reference", reference)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return undefined;
  return mapPayment(row as PaymentRow);
}

export async function dbGetBookingActivity(): Promise<{
  reservations: ReservationRecord[];
  payments: PaymentRecord[];
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const [resResult, payResult] = await Promise.all([
    supabase
      .from("reservations")
      .select()
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("payments")
      .select()
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (resResult.error) throw new Error(resResult.error.message);
  if (payResult.error) throw new Error(payResult.error.message);

  return {
    reservations: (resResult.data as ReservationRow[]).map(mapReservation),
    payments: (payResult.data as PaymentRow[]).map(mapPayment),
  };
}
