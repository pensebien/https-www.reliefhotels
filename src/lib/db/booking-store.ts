import { getSupabaseAdmin } from "@/lib/db/client";
import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";

type ReservationRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  check_in: string | null;
  check_out: string | null;
  room_id: string | null;
  guests: number;
  nights: number | null;
  item_type: ReservationRecord["itemType"];
  payment_reference: string | null;
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
  reservation_id: string | null;
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
    phone: row.phone ?? undefined,
    itemType: row.item_type,
    roomId: row.room_id ?? undefined,
    checkIn: row.check_in ?? undefined,
    checkOut: row.check_out ?? undefined,
    nights: row.nights ?? undefined,
    guests: row.guests,
    stayPreference: row.stay_preference,
    message: row.message,
    status: row.status,
    paymentReference: row.payment_reference ?? undefined,
    source: row.source,
    emailSent: row.email_sent,
    createdAt: row.created_at,
  };
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    reference: row.reference,
    reservationId: row.reservation_id ?? undefined,
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

function reservationPatchToRow(
  patch: Partial<ReservationRecord>,
): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  if (patch.firstName !== undefined) update.first_name = patch.firstName;
  if (patch.lastName !== undefined) update.last_name = patch.lastName;
  if (patch.email !== undefined) update.email = patch.email;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (patch.itemType !== undefined) update.item_type = patch.itemType;
  if (patch.roomId !== undefined) update.room_id = patch.roomId;
  if (patch.checkIn !== undefined) update.check_in = patch.checkIn;
  if (patch.checkOut !== undefined) update.check_out = patch.checkOut;
  if (patch.nights !== undefined) update.nights = patch.nights;
  if (patch.guests !== undefined) update.guests = patch.guests;
  if (patch.stayPreference !== undefined) {
    update.stay_preference = patch.stayPreference;
  }
  if (patch.message !== undefined) update.message = patch.message;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.paymentReference !== undefined) {
    update.payment_reference = patch.paymentReference;
  }
  if (patch.emailSent !== undefined) update.email_sent = patch.emailSent;
  return update;
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
      phone: data.phone ?? null,
      check_in: data.checkIn ?? null,
      check_out: data.checkOut ?? null,
      room_id: data.roomId ?? null,
      guests: data.guests,
      nights: data.nights ?? null,
      item_type: data.itemType,
      payment_reference: data.paymentReference ?? null,
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

export async function dbUpdateReservationById(
  id: string,
  patch: Partial<ReservationRecord>,
): Promise<ReservationRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const update = reservationPatchToRow(patch);
  if (Object.keys(update).length === 0) {
    return (await dbFindReservationById(id)) ?? null;
  }

  const { data: row, error } = await supabase
    .from("reservations")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;
  return mapReservation(row as ReservationRow);
}

export async function dbFindReservationById(
  id: string,
): Promise<ReservationRecord | undefined> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: row, error } = await supabase
    .from("reservations")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return undefined;
  return mapReservation(row as ReservationRow);
}

export async function dbUpdateReservationByPaymentReference(
  paymentReference: string,
  patch: Pick<Partial<ReservationRecord>, "status" | "paymentReference">,
): Promise<ReservationRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const update = reservationPatchToRow(patch);
  if (Object.keys(update).length === 0) return null;

  const { data: row, error } = await supabase
    .from("reservations")
    .update(update)
    .eq("payment_reference", paymentReference)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;
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
      reservation_id: data.reservationId ?? null,
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
  if (patch.reservationId !== undefined) {
    update.reservation_id = patch.reservationId;
  }

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
      .limit(250),
    supabase
      .from("payments")
      .select()
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  if (resResult.error) throw new Error(resResult.error.message);
  if (payResult.error) throw new Error(payResult.error.message);

  return {
    reservations: (resResult.data as ReservationRow[]).map(mapReservation),
    payments: (payResult.data as PaymentRow[]).map(mapPayment),
  };
}
