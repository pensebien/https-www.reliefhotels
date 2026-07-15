import { rooms } from "@/content/site";
import type { ReservationRecord } from "@/lib/demo-store";

const DEFAULT_BASE_URL = "https://cloud-relay-nu.vercel.app";

function rayzaRoomIdentifier(roomId: string | undefined): string {
  if (!roomId) return "UNKNOWN";
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return roomId.toUpperCase().replace(/-/g, "_");
  return room.id.toUpperCase().replace(/-/g, "_");
}

function isRayzaEnabled(): boolean {
  return (
    process.env.RAYZA_CONNECT_ENABLED === "true" &&
    Boolean(process.env.RAYZA_API_KEY?.trim())
  );
}

function rayzaHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    authorization: process.env.RAYZA_API_KEY!.trim(),
  };
}

function rayzaBaseUrl(): string {
  return (process.env.RAYZA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
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

  const bookingReference =
    record.paymentReference ?? `RH-${record.id.slice(0, 8).toUpperCase()}`;

  try {
    const res = await fetch(`${rayzaBaseUrl()}/v1/bookings`, {
      method: "POST",
      headers: rayzaHeaders(),
      body: JSON.stringify({
        booking_reference: bookingReference,
        guest_name: `${record.firstName} ${record.lastName}`.trim(),
        room_identifier: rayzaRoomIdentifier(record.roomId),
        check_in: record.checkIn,
        check_out: record.checkOut,
        guest_phone: record.phone,
        guest_email: record.email,
        source_platform: "relief-hotels",
        is_test: process.env.DEMO_MODE === "true",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body || `RAYZA create failed (${res.status})` };
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

  const bookingReference =
    record.paymentReference ?? `RH-${record.id.slice(0, 8).toUpperCase()}`;

  try {
    const res = await fetch(
      `${rayzaBaseUrl()}/v1/bookings/${encodeURIComponent(bookingReference)}/cancel`,
      {
        method: "POST",
        headers: rayzaHeaders(),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body || `RAYZA cancel failed (${res.status})` };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "RAYZA cancel failed";
    return { ok: false, error: message };
  }
}
