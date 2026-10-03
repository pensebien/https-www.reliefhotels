import { getSupabaseAdmin } from "@/lib/db/client";
import type {
  NewReservation,
  PaymentRecord,
  ReservationRecord,
} from "@/lib/demo-store";

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
  staff_notes: string | null;
  created_at: string;
  // Migration 016 — absent (undefined) on databases that predate it.
  units?: number | null;
  coupon_code?: string | null;
  extra_ids?: string[] | null;
  quoted_total_ngn?: number | null;
  quoted_deposit_ngn?: number | null;
  hold_expires_at?: string | null;
  cancelled_at?: string | null;
  assigned_units?: string[] | null;
  quote_snapshot?: ReservationRecord["quoteSnapshot"] | null;
  group_id?: string | null;
  booking_channel?: "online" | "desk" | null;
  card_consent?: boolean | null;
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
  payment_method: PaymentRecord["paymentMethod"] | null;
  payment_channel: PaymentRecord["paymentChannel"] | null;
  external_reference: string | null;
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
    staffNotes: row.staff_notes ?? undefined,
    createdAt: row.created_at,
    units: row.units ?? undefined,
    couponCode: row.coupon_code ?? undefined,
    extraIds: row.extra_ids ?? undefined,
    quotedTotalNgn: row.quoted_total_ngn ?? undefined,
    quotedDepositNgn: row.quoted_deposit_ngn ?? undefined,
    holdExpiresAt: row.hold_expires_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    assignedUnits: row.assigned_units ?? undefined,
    quoteSnapshot: row.quote_snapshot ?? undefined,
    groupId: row.group_id ?? undefined,
    bookingChannel: row.booking_channel ?? undefined,
    cardConsent: row.card_consent ?? undefined,
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
    paymentMethod: row.payment_method ?? undefined,
    paymentChannel: row.payment_channel ?? undefined,
    externalReference: row.external_reference ?? undefined,
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
  if (patch.staffNotes !== undefined) update.staff_notes = patch.staffNotes;
  if (patch.units !== undefined) update.units = patch.units;
  if (patch.couponCode !== undefined) update.coupon_code = patch.couponCode;
  if (patch.extraIds !== undefined) update.extra_ids = patch.extraIds;
  if (patch.quotedTotalNgn !== undefined) {
    update.quoted_total_ngn = patch.quotedTotalNgn;
  }
  if (patch.quotedDepositNgn !== undefined) {
    update.quoted_deposit_ngn = patch.quotedDepositNgn;
  }
  if (patch.holdExpiresAt !== undefined) {
    update.hold_expires_at = patch.holdExpiresAt;
  }
  if (patch.cancelledAt !== undefined) update.cancelled_at = patch.cancelledAt;
  if (patch.assignedUnits !== undefined) update.assigned_units = patch.assignedUnits;
  if (patch.quoteSnapshot !== undefined) update.quote_snapshot = patch.quoteSnapshot;
  if (patch.groupId !== undefined) update.group_id = patch.groupId;
  if (patch.bookingChannel !== undefined) update.booking_channel = patch.bookingChannel;
  if (patch.cardConsent !== undefined) update.card_consent = patch.cardConsent;
  return update;
}

/**
 * Insert row for a new reservation. Booking-engine columns are only sent when
 * set, so staff/front-desk inserts keep working on databases without
 * migration 016.
 */
function newReservationRow(data: NewReservation): Record<string, unknown> {
  return {
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
    ...reservationPatchToRow({
      units: data.units,
      couponCode: data.couponCode,
      extraIds: data.extraIds,
      quotedTotalNgn: data.quotedTotalNgn,
      quotedDepositNgn: data.quotedDepositNgn,
      holdExpiresAt: data.holdExpiresAt,
    }),
  };
}

export async function dbAddReservation(
  data: NewReservation,
): Promise<ReservationRecord> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: row, error } = await supabase
    .from("reservations")
    .insert(newReservationRow(data))
    .select()
    .single();

  if (error || !row) throw new Error(error?.message ?? "Insert reservation failed");
  return mapReservation(row as ReservationRow);
}

/**
 * Check-and-insert in one transaction under a per-room advisory lock
 * (reserve_room(), migration 016). Returns null when the room sold out
 * between the guest's search and their submit.
 */
export async function dbReserveRoom(
  data: NewReservation,
  defaultInventory: number,
): Promise<ReservationRecord | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: rows, error } = await supabase.rpc("reserve_room", {
    p_reservation: newReservationRow(data),
    p_default_inventory: defaultInventory,
  });

  if (error) throw new Error(error.message);
  const row = (rows as ReservationRow[] | null)?.[0];
  return row ? mapReservation(row) : null;
}

export async function dbCountCouponRedemptions(code: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("reservations")
    .select("id, group_id")
    .eq("coupon_code", code)
    .neq("status", "cancelled");

  // Pre-016 databases have no coupon_code column, so nothing was redeemed.
  if (error) return 0;
  // A group booking uses the code once, however many room types it has.
  return new Set((data ?? []).map((r) => (r.group_id as string | null) ?? (r.id as string))).size;
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
      payment_method: data.paymentMethod ?? null,
      payment_channel: data.paymentChannel ?? null,
      external_reference: data.externalReference ?? null,
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
  if (patch.externalReference !== undefined) {
    update.external_reference = patch.externalReference;
  }
  if (patch.paymentMethod !== undefined) {
    update.payment_method = patch.paymentMethod;
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

export async function dbListOverlappingRoomReservations(
  roomId: string,
  checkIn: string,
  checkOut: string,
): Promise<ReservationRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("reservations")
    .select()
    .eq("item_type", "room")
    .eq("room_id", roomId)
    .neq("status", "cancelled")
    .lt("check_in", checkOut)
    .gt("check_out", checkIn);

  if (error) throw new Error(error.message);
  return (data as ReservationRow[]).map(mapReservation);
}

export async function dbListReservationsForReport(from: string, to: string): Promise<ReservationRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const endYmd = end.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("reservations")
    .select()
    .eq("item_type", "room")
    .or(
      `and(check_in.lt.${endYmd},check_out.gt.${from}),and(created_at.gte.${from},created_at.lt.${endYmd}),and(cancelled_at.gte.${from},cancelled_at.lt.${endYmd})`,
    );
  if (error) throw new Error(error.message);
  return (data as ReservationRow[]).map(mapReservation);
}

export async function dbListPaymentsForReport(from: string, to: string): Promise<PaymentRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const { data, error } = await supabase
    .from("payments")
    .select()
    .gte("created_at", from)
    .lt("created_at", end.toISOString().slice(0, 10));
  if (error) throw new Error(error.message);
  return (data as PaymentRow[]).map(mapPayment);
}

export async function dbListReservationsByGroup(groupId: string): Promise<ReservationRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("reservations").select().eq("group_id", groupId);
  if (error) throw new Error(error.message);
  return (data as ReservationRow[]).map(mapReservation);
}

export async function dbFindPendingRefund(
  transactionReference: string,
  amountKobo: number,
): Promise<PaymentRecord | undefined> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("payments")
    .select()
    .eq("external_reference", transactionReference)
    .eq("amount_kobo", amountKobo)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPayment(data as PaymentRow) : undefined;
}

export async function dbListPaymentsForReservation(
  reservationId: string,
): Promise<PaymentRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("payments")
    .select()
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as PaymentRow[]).map(mapPayment);
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
