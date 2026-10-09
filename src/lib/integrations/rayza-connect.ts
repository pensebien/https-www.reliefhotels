/**
 * RAYZA Connect (Cloud Relay API v4.2) — the HTTP layer and the pure pieces
 * (references, payloads, error parsing). Orchestration — which reservation
 * goes where, room links, sync status, availability — is in ./rayza-sync.ts.
 *
 * Docs: https://cloud-relay-nu.vercel.app (spec at /openapi.json).
 * RAYZA is the hotel-side source of truth: it re-checks availability, guest
 * capacity, stay rules and currency on every booking.
 */

import type { ReservationRecord } from "@/lib/demo-store";

const DEFAULT_BASE_URL = "https://cloud-relay-nu.vercel.app";
const TIMEOUT_MS = 8_000;

export function isRayzaEnabled(): boolean {
  return process.env.RAYZA_CONNECT_ENABLED === "true" && Boolean(process.env.RAYZA_API_KEY?.trim());
}

function rayzaBaseUrl(): string {
  return (process.env.RAYZA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

export type RayzaResponse = { status: number; json: unknown; text: string };

/** One call to the relay. Network failures and timeouts come back as status 0. */
export async function rayzaRequest(
  path: string,
  init: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {},
): Promise<RayzaResponse> {
  try {
    const res = await fetch(`${rayzaBaseUrl()}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${process.env.RAYZA_API_KEY?.trim() ?? ""}`,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON (gateway error page) — keep the text.
    }
    return { status: res.status, json, text };
  } catch (error) {
    const message = error instanceof Error ? error.message : "RAYZA request failed";
    return { status: 0, json: null, text: message };
  }
}

export type RayzaError = { code?: string; message: string };

/**
 * v4.2 errors are `{"status":"rejected","error":{"code","message"}}`; older
 * FastAPI shapes (`{"detail": "..."}` / `{"detail": [{"msg"}]}`) still parse.
 */
export function parseRayzaError(body: string, fallback: string): RayzaError {
  if (!body.trim()) return { message: fallback };
  try {
    const parsed = JSON.parse(body) as {
      error?: { code?: string; message?: string };
      detail?: string | { msg?: string }[] | { code?: string; message?: string };
    };
    if (parsed.error?.message) return { code: parsed.error.code, message: parsed.error.message };
    const detail = parsed.detail;
    if (typeof detail === "string") return { message: detail };
    if (Array.isArray(detail)) {
      const messages = detail.map((d) => d.msg).filter(Boolean);
      if (messages.length) return { code: "VALIDATION_ERROR", message: messages.join("; ") };
    } else if (detail?.message) {
      return { code: detail.code, message: detail.message };
    }
  } catch {
    // Not JSON — fall through to the raw body.
  }
  return { message: body.slice(0, 300) || fallback };
}

// ─── Room catalogue (GET /v1/rooms) ─────────────────────────────────────

export type RayzaRoomType = {
  id: string;
  name: string;
  /** Free room numbers for the dates asked; every number when no dates. */
  roomNumbers: string[];
  totalRooms: number;
  availableCount: number;
  priceNgn: number;
  priceWithTaxNgn: number;
  minLos: number;
  maxOccupancy: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
};

export type RayzaCatalogue = { currency: string; rooms: RayzaRoomType[] };

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export function parseCatalogue(json: unknown): RayzaCatalogue | null {
  const doc = json as { currency?: unknown; rooms?: unknown } | null;
  if (!doc || !Array.isArray(doc.rooms)) return null;
  const rooms = doc.rooms.flatMap((raw): RayzaRoomType[] => {
    const r = raw as Record<string, unknown>;
    if (typeof r.room_type_identifier !== "string") return [];
    const capacity = (r.capacity ?? {}) as Record<string, unknown>;
    const roomNumbers = Array.isArray(r.room_numbers) ? r.room_numbers.map(String) : [];
    return [
      {
        id: r.room_type_identifier,
        name: typeof r.room_type_name === "string" ? r.room_type_name : r.room_type_identifier,
        roomNumbers,
        totalRooms: num(r.total_rooms, roomNumbers.length),
        availableCount: num(r.available_count, r.available === false ? 0 : roomNumbers.length),
        priceNgn: num(r.tax_exclusive_price, num(r.base_price)),
        priceWithTaxNgn: num(r.tax_inclusive_price, num(r.base_price)),
        minLos: num(r.min_los, 1),
        maxOccupancy: num(capacity.max_occupancy, 99),
        closedToArrival: r.closed_to_arrival === true,
        closedToDeparture: r.closed_to_departure === true,
      },
    ];
  });
  return { currency: typeof doc.currency === "string" ? doc.currency : "NGN", rooms };
}

export async function fetchRayzaCatalogue(
  dates?: { checkIn: string; checkOut: string },
): Promise<{ ok: true; catalogue: RayzaCatalogue } | { ok: false; error: string }> {
  const q = dates ? `?check_in=${dates.checkIn}&check_out=${dates.checkOut}` : "";
  const res = await rayzaRequest(`/v1/rooms${q}`);
  if (res.status !== 200) {
    return { ok: false, error: parseRayzaError(res.text, `RAYZA rooms failed (${res.status || "no response"})`).message };
  }
  const catalogue = parseCatalogue(res.json);
  return catalogue ? { ok: true, catalogue } : { ok: false, error: "RAYZA returned an unexpected room list" };
}

// ─── References ──────────────────────────────────────────────────────────

/**
 * RAYZA rewrites any reference that doesn't start with "BK-" (it turned
 * "RH-AB12" into "BK-AB12"), so cancelling by our own reference then 404s.
 * Ours start with BK- and come from the reservation id, so they are stable
 * across payment retries; a booking of several rooms gets one per room.
 */
export function rayzaReferences(record: Pick<ReservationRecord, "id" | "units">): string[] {
  const base = `BK-RH-${record.id.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const units = Math.max(1, record.units ?? 1);
  return units === 1 ? [base] : Array.from({ length: units }, (_, i) => `${base}-${i + 1}`);
}

/** What RAYZA stored for references pushed before v4.2 (payment ref or RH-xxxx). */
export function legacyRayzaReference(record: ReservationRecord): string {
  const ours = record.paymentReference ?? `RH-${record.id.slice(0, 8).toUpperCase()}`;
  return ours.startsWith("BK-") ? ours : `BK-${ours.replace(/^([A-Za-z]+-)+/, "")}`;
}

// ─── Booking payload (POST /v1/bookings) ─────────────────────────────────

/** Splits a whole number into `parts` near-equal whole numbers that add up to it. */
export function splitEvenly(total: number, parts: number): number[] {
  const n = Math.max(1, parts);
  const whole = Math.max(0, Math.round(total));
  const base = Math.floor(whole / n);
  return Array.from({ length: n }, (_, i) => base + (i < whole % n ? 1 : 0));
}

export type RayzaBookingIn = {
  booking_reference: string;
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  room_identifier: string;
  room_number?: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  amount: number;
  currency: "NGN";
  deposit_paid: number;
  payment_status: "paid" | "partial" | "unpaid";
  payment_reference?: string;
  source_platform: string;
  is_test: boolean;
};

/** One RAYZA booking per room of the reservation; amounts and guests are split across them. */
export function buildBookingBodies(
  record: ReservationRecord,
  ctx: { roomType: string; roomNumbers: (string | undefined)[]; paidNgn: number; isTest: boolean },
): RayzaBookingIn[] {
  const refs = rayzaReferences(record);
  const amounts = splitEvenly(record.quotedTotalNgn ?? record.quoteSnapshot?.totalNgn ?? 0, refs.length);
  const paid = splitEvenly(ctx.paidNgn, refs.length);
  const adults = splitEvenly(Math.max(record.guests, refs.length), refs.length);
  return refs.map((ref, i) => {
    const deposit = Math.min(paid[i], amounts[i] || paid[i]);
    return {
      booking_reference: ref,
      guest_name: `${record.firstName} ${record.lastName}`.trim(),
      guest_phone: record.phone?.trim() ?? "",
      guest_email: record.email || undefined,
      room_identifier: ctx.roomType,
      room_number: ctx.roomNumbers[i],
      check_in: record.checkIn!,
      check_out: record.checkOut!,
      adults: Math.max(1, adults[i]),
      children: 0,
      amount: amounts[i],
      currency: "NGN",
      deposit_paid: deposit,
      payment_status: deposit <= 0 ? "unpaid" : deposit >= amounts[i] ? "paid" : "partial",
      payment_reference: record.paymentReference,
      source_platform: "relief-hotels",
      is_test: ctx.isTest,
    };
  });
}

export type RayzaCallResult =
  | { ok: true; reference: string }
  | { ok: false; status: number; code?: string; error: string };

export async function createRayzaBooking(body: RayzaBookingIn): Promise<RayzaCallResult> {
  const res = await rayzaRequest("/v1/bookings", { method: "POST", body });
  if (res.status === 200 || res.status === 201) {
    const stored = (res.json as { booking_reference?: string } | null)?.booking_reference;
    return { ok: true, reference: stored ?? body.booking_reference };
  }
  const err = parseRayzaError(res.text, `RAYZA booking failed (${res.status || "no response"})`);
  return { ok: false, status: res.status, code: err.code, error: err.message };
}

/** 200 covers cancelled and already_cancelled; 404 means RAYZA never had it. */
export async function cancelRayzaBooking(
  reference: string,
): Promise<RayzaCallResult | { ok: true; reference: string; notFound: true }> {
  const res = await rayzaRequest(`/v1/bookings/${encodeURIComponent(reference)}/cancel`, { method: "POST" });
  if (res.status === 200) return { ok: true, reference };
  if (res.status === 404) return { ok: true, reference, notFound: true };
  const err = parseRayzaError(res.text, `RAYZA cancel failed (${res.status || "no response"})`);
  return { ok: false, status: res.status, code: err.code, error: err.message };
}

export async function updateRayzaBooking(
  reference: string,
  change: { check_in?: string; check_out?: string; room_number?: string; room_type?: string; amount?: number },
): Promise<RayzaCallResult> {
  const res = await rayzaRequest(`/v1/bookings/${encodeURIComponent(reference)}`, { method: "PATCH", body: change });
  if (res.status === 200) return { ok: true, reference };
  const err = parseRayzaError(res.text, `RAYZA update failed (${res.status || "no response"})`);
  return { ok: false, status: res.status, code: err.code, error: err.message };
}
