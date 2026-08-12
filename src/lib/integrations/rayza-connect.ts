import { rooms } from "@/content/site";
import { findPaymentByReference, type ReservationRecord } from "@/lib/demo-store";

const DEFAULT_BASE_URL = "https://cloud-relay-nu.vercel.app";

function isRayzaEnabled(): boolean {
  return (
    process.env.RAYZA_CONNECT_ENABLED === "true" &&
    Boolean(process.env.RAYZA_API_KEY?.trim())
  );
}

function rayzaHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    // RAYZA's gateway requires the standard Bearer scheme, not a raw key.
    Authorization: `Bearer ${process.env.RAYZA_API_KEY!.trim()}`,
  };
}

function rayzaBaseUrl(): string {
  return (process.env.RAYZA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

/**
 * RAYZA has no separate catalog of Relief's rooms — Relief's own slug
 * (e.g. "signature-suite") doubles as the RAYZA room identifier so both
 * sides agree without a mapping table to keep in sync.
 */
export function rayzaRoomIdentifier(roomId: string | undefined): string | undefined {
  if (!roomId) return undefined;
  return rooms.some((room) => room.id === roomId) ? roomId : undefined;
}

export function bookingReferenceFor(record: ReservationRecord): string {
  return record.paymentReference ?? `RH-${record.id.slice(0, 8).toUpperCase()}`;
}

/** Unwraps FastAPI's `{"detail": "..."}` / `{"detail": [{"msg": "..."}]}` error shapes. */
export function parseRayzaErrorBody(body: string, fallback: string): string {
  if (!body.trim()) return fallback;
  try {
    const parsed = JSON.parse(body) as {
      detail?: string | { msg?: string }[];
    };
    if (typeof parsed.detail === "string") return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      const messages = parsed.detail.map((d) => d.msg).filter(Boolean);
      if (messages.length) return messages.join("; ");
    }
  } catch {
    // Not JSON — fall through to the raw body.
  }
  return body || fallback;
}

async function resolveAmountNaira(
  record: ReservationRecord,
): Promise<number | undefined> {
  if (!record.paymentReference) return undefined;
  const payment = await findPaymentByReference(record.paymentReference);
  if (!payment || payment.status !== "success") return undefined;
  return payment.amountKobo / 100;
}

export type RayzaSyncResult =
  | { ok: true; skipped?: false }
  | { ok: false; error: string }
  | { ok: true; skipped: true };

export async function pushReservationToRayza(
  record: ReservationRecord,
): Promise<RayzaSyncResult> {
  if (!isRayzaEnabled()) return { ok: true, skipped: true };
  if (!record.checkIn || !record.checkOut || record.itemType !== "room") {
    return { ok: true, skipped: true };
  }

  const roomIdentifier = rayzaRoomIdentifier(record.roomId);
  const amount = await resolveAmountNaira(record);

  try {
    const res = await fetch(`${rayzaBaseUrl()}/v1/bookings`, {
      method: "POST",
      headers: rayzaHeaders(),
      body: JSON.stringify({
        booking_reference: bookingReferenceFor(record),
        guest_name: `${record.firstName} ${record.lastName}`.trim(),
        guest_phone: record.phone,
        guest_email: record.email,
        room_identifier: roomIdentifier,
        room_type: roomIdentifier,
        check_in: record.checkIn,
        check_out: record.checkOut,
        amount,
        source_platform: "relief-hotels",
        is_test: process.env.DEMO_MODE === "true",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        error: parseRayzaErrorBody(body, `RAYZA create failed (${res.status})`),
      };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "RAYZA request failed";
    return { ok: false, error: message };
  }
}

export async function cancelReservationOnRayza(
  record: ReservationRecord,
): Promise<RayzaSyncResult> {
  if (!isRayzaEnabled()) return { ok: true, skipped: true };

  const bookingReference = bookingReferenceFor(record);

  try {
    const res = await fetch(
      `${rayzaBaseUrl()}/v1/bookings/${encodeURIComponent(bookingReference)}/cancel`,
      {
        method: "POST",
        headers: rayzaHeaders(),
      },
    );

    // RAYZA returns 404 once a reference is already cancelled/gone — treat
    // that as success so double-cancels and retries stay idempotent.
    if (res.status === 404) return { ok: true };

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        error: parseRayzaErrorBody(body, `RAYZA cancel failed (${res.status})`),
      };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "RAYZA cancel failed";
    return { ok: false, error: message };
  }
}
