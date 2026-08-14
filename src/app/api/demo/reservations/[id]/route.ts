import { addRoomBlock, type RoomBlock } from "@/lib/db/inventory-store";
import {
  findReservationById,
  updateReservationById,
} from "@/lib/demo-store";
import {
  cancelReservationOnRayza,
  pushReservationToRayza,
} from "@/lib/integrations/rayza-connect";
import { addDays, formatYmd } from "@/lib/reservation-dates";
import { staffReservationPatchSchema } from "@/lib/schemas/staff-reservation-patch";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

/**
 * Checkout hands the room to housekeeping: block it for today so it can't
 * be re-booked until the cleaner marks it clean (or picks a later
 * checkOut when creating the block manually) — see /staff/housekeeping.
 */
async function blockRoomForHousekeeping(roomId: string): Promise<RoomBlock> {
  const today = formatYmd(new Date());
  const tomorrow = formatYmd(addDays(new Date(), 1));
  return addRoomBlock({
    roomId,
    checkIn: today,
    checkOut: tomorrow,
    reason: "Housekeeping — guest checked out",
    blockType: "housekeeping",
  });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;

  const { id } = await context.params;

  try {
    const existing = await findReservationById(id);
    if (!existing) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    if (existing.source === "demo") {
      return NextResponse.json(
        { error: "Demo seed reservations cannot be modified" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = staffReservationPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid patch", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, staffNotes } = parsed.data;

    if (status === "confirmed" && existing.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot confirm a cancelled reservation" },
        { status: 409 },
      );
    }
    if (status === "cancelled" && existing.status === "cancelled") {
      return NextResponse.json({ ok: true, reservation: existing, rayza: null });
    }
    if (status === "checked_out" && existing.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only a confirmed reservation can be checked out" },
        { status: 409 },
      );
    }

    const patch: Parameters<typeof updateReservationById>[1] = {};
    if (status) patch.status = status;
    if (staffNotes !== undefined) patch.staffNotes = staffNotes;

    const updated = await updateReservationById(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    let rayza: { ok: boolean; error?: string } | null = null;
    if (status === "confirmed") {
      const result = await pushReservationToRayza(updated);
      if ("skipped" in result && result.skipped) {
        rayza = null;
      } else {
        rayza = result;
      }
    } else if (status === "cancelled") {
      const result = await cancelReservationOnRayza(updated);
      if ("skipped" in result && result.skipped) {
        rayza = null;
      } else {
        rayza = result;
      }
    }

    let housekeeping: RoomBlock | null = null;
    if (status === "checked_out" && updated.roomId) {
      housekeeping = await blockRoomForHousekeeping(updated.roomId);
    }

    return NextResponse.json({ ok: true, reservation: updated, rayza, housekeeping });
  } catch (error) {
    console.error("[demo/reservations/PATCH]", error);
    const message =
      error instanceof Error ? error.message : "Unable to update reservation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
