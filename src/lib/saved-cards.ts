/**
 * Saved cards (Sirvoy "store cards and charge later"). Only Paystack's
 * reusable authorization token is kept — never card numbers — and only when
 * the guest ticked consent at checkout. The token is server-only: the API
 * returns brand / last 4 / expiry, never the code. Guests can remove it from
 * their manage link; it's deleted with ID data after the retention period.
 */

import { getServerConfig } from "@/lib/config";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { dataPath } from "@/lib/data-dir";
import {
  addPayment,
  findReservationById,
  listGroupMembers,
  listPaymentsForReservation,
  updatePaymentByReference,
  updateReservationById,
  type ReservationRecord,
} from "@/lib/demo-store";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";
import type { PaystackAuthorization } from "@/lib/paystack";
import { paystackFetch } from "@/lib/paystack-auth";
import { rooms } from "@/content/site";
import { randomBytes } from "crypto";

type StoredCard = {
  reservationId: string;
  email: string;
  authorizationCode: string;
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  bank: string;
  createdAt: string;
};

export type SavedCardSummary = Omit<StoredCard, "authorizationCode" | "email">;

const FILE = dataPath("saved-cards.json");
type Store = { cards: StoredCard[] };
const empty = (): Store => ({ cards: [] });

const summary = ({ authorizationCode: _code, email: _email, ...rest }: StoredCard): SavedCardSummary => rest;

async function findStored(reservationId: string): Promise<StoredCard | undefined> {
  if (!isSupabaseEnabled()) {
    return (await readJsonFile(FILE, empty)).cards.find((c) => c.reservationId === reservationId);
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return undefined;
  const { data, error } = await supabase.from("saved_cards").select().eq("reservation_id", reservationId).maybeSingle();
  if (error || !data) return undefined;
  return {
    reservationId: data.reservation_id as string,
    email: data.email as string,
    authorizationCode: data.authorization_code as string,
    brand: data.brand as string,
    last4: data.last4 as string,
    expMonth: data.exp_month as string,
    expYear: data.exp_year as string,
    bank: (data.bank as string | null) ?? "",
    createdAt: data.created_at as string,
  };
}

/** The lead line holds the card for a group booking. */
const leadIdOf = (r: ReservationRecord) => r.groupId ?? r.id;

export async function findSavedCard(reservationId: string): Promise<SavedCardSummary | undefined> {
  const reservation = await findReservationById(reservationId);
  if (!reservation) return undefined;
  const card = await findStored(leadIdOf(reservation));
  return card ? summary(card) : undefined;
}

/** Called after a successful charge; keeps the card only with consent and a reusable card token. */
export async function saveCardIfConsented(
  reservation: ReservationRecord,
  email: string,
  authorization: PaystackAuthorization | undefined,
): Promise<boolean> {
  const lead = reservation.groupId ? (await findReservationById(reservation.groupId)) ?? reservation : reservation;
  if (!lead.cardConsent || !authorization?.authorization_code || authorization.reusable === false) return false;
  if (authorization.channel && authorization.channel !== "card") return false;

  const card: StoredCard = {
    reservationId: lead.id,
    email,
    authorizationCode: authorization.authorization_code,
    brand: authorization.card_type?.trim() || "card",
    last4: authorization.last4 ?? "",
    expMonth: authorization.exp_month ?? "",
    expYear: authorization.exp_year ?? "",
    bank: authorization.bank ?? "",
    createdAt: new Date().toISOString(),
  };
  if (!isSupabaseEnabled()) {
    await updateJsonFile(FILE, empty, (store) => {
      store.cards = [card, ...store.cards.filter((c) => c.reservationId !== card.reservationId)];
    });
    return true;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { error } = await supabase.from("saved_cards").upsert({
    reservation_id: card.reservationId,
    email: card.email,
    authorization_code: card.authorizationCode,
    brand: card.brand,
    last4: card.last4,
    exp_month: card.expMonth,
    exp_year: card.expYear,
    bank: card.bank,
    created_at: card.createdAt,
  });
  if (error) throw new Error(error.message);
  return true;
}

export async function deleteSavedCard(reservationId: string): Promise<boolean> {
  const reservation = await findReservationById(reservationId);
  const id = reservation ? leadIdOf(reservation) : reservationId;
  if (!isSupabaseEnabled()) {
    return updateJsonFile(FILE, empty, (store) => {
      const before = store.cards.length;
      store.cards = store.cards.filter((c) => c.reservationId !== id);
      return store.cards.length < before;
    });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const { error, count } = await supabase.from("saved_cards").delete({ count: "exact" }).eq("reservation_id", id);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

/** Outstanding balance across a booking (all group lines) — the most a saved card may be charged. */
export async function outstandingBalanceNgn(reservation: ReservationRecord): Promise<number> {
  const members = (await listGroupMembers(reservation)).filter((m) => m.status !== "cancelled");
  const total = members.reduce((sum, m) => {
    const catalog = rooms.find((r) => r.id === m.roomId)?.priceFrom ?? 0;
    return sum + (m.quotedTotalNgn ?? catalog * (m.nights ?? 1) * (m.units ?? 1));
  }, 0);
  const payments = (await Promise.all(members.map((m) => listPaymentsForReservation(m.id)))).flat();
  const paid = payments.filter((p) => p.status === "success").reduce((sum, p) => sum + p.amountKobo / 100, 0);
  return Math.max(0, Math.round(total - paid));
}

export type ChargeResult =
  | { ok: true; reference: string; status: "success" | "pending" }
  | { ok: false; status: 404 | 409 | 422 | 502; error: string };

export async function chargeSavedCard(input: {
  reservationId: string;
  amountNgn: number;
  reason: string;
  staffName?: string;
}): Promise<ChargeResult> {
  const reservation = await findReservationById(input.reservationId);
  if (!reservation) return { ok: false, status: 404, error: "Reservation not found" };
  const lead = reservation.groupId ? (await findReservationById(reservation.groupId)) ?? reservation : reservation;
  const card = await findStored(lead.id);
  if (!card) return { ok: false, status: 404, error: "No saved card on this booking" };

  const balance = await outstandingBalanceNgn(lead);
  if (input.amountNgn > balance) {
    return { ok: false, status: 409, error: `At most ₦${balance.toLocaleString("en-NG")} is outstanding on this booking` };
  }

  const reference = `RH-CARD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(4).toString("hex")}`;
  await addPayment({
    reference,
    reservationId: lead.id,
    email: card.email,
    amountKobo: input.amountNgn * 100,
    currency: "NGN",
    status: "pending",
    itemType: "room",
    itemId: lead.roomId ?? "room",
    itemLabel: `Saved card charge — ${input.reason}`.slice(0, 200),
    paymentMethod: "paystack",
    paymentChannel: "paystack",
  });

  const config = getServerConfig();
  let status: "success" | "pending" | "failed" = "success";
  if (!config.demoMode && config.paystack.configured) {
    const res = await paystackFetch(config.paystack.secretKey, "/transaction/charge_authorization", {
      method: "POST",
      body: JSON.stringify({
        email: card.email,
        amount: input.amountNgn * 100,
        authorization_code: card.authorizationCode,
        reference,
        metadata: { reservationId: lead.id, reason: input.reason },
      }),
    });
    const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: { status?: string } } | null;
    if (!res.ok || !body?.status) {
      await updatePaymentByReference(reference, { status: "failed" });
      return { ok: false, status: 502, error: body?.message ?? "Paystack declined the charge" };
    }
    status = body.data?.status === "success" ? "success" : body.data?.status === "failed" ? "failed" : "pending";
  }
  await updatePaymentByReference(reference, { status: status === "failed" ? "failed" : status });
  if (status === "failed") return { ok: false, status: 502, error: "The card was declined" };

  const note = `Saved card ${card.brand} ••••${card.last4} charged ₦${input.amountNgn.toLocaleString("en-NG")}${
    input.staffName ? ` by ${input.staffName}` : ""
  }: ${input.reason}`;
  await updateReservationById(lead.id, {
    staffNotes: lead.staffNotes ? `${note}\n${lead.staffNotes}` : note,
  });
  return { ok: true, reference, status };
}

/** Deletes saved cards for stays that ended more than `retentionDays` ago. */
export async function purgeExpiredCards(retentionDays: number, now = Date.now()): Promise<number> {
  const cutoff = new Date(now - retentionDays * 86_400_000).toISOString().slice(0, 10);
  const cards = !isSupabaseEnabled()
    ? (await readJsonFile(FILE, empty)).cards
    : (((await getSupabaseAdmin()?.from("saved_cards").select("reservation_id"))?.data ?? []) as { reservation_id: string }[]).map(
        (r) => ({ reservationId: r.reservation_id }) as StoredCard,
      );
  let purged = 0;
  for (const card of cards) {
    const reservation = await findReservationById(card.reservationId);
    const endDay = reservation?.status === "cancelled"
      ? (reservation.cancelledAt ?? reservation.createdAt).slice(0, 10)
      : reservation?.checkOut;
    if (reservation && endDay && endDay > cutoff) continue;
    if (await deleteSavedCard(card.reservationId)) purged += 1;
  }
  return purged;
}
