import {
  unauthorizedDashboardResponse,
  isValidDashboardKey,
} from "@/lib/dashboard-auth";
import {
  findReservationById,
  updateReservationById,
} from "@/lib/demo-store";
import {
  cancelReservationOnRayza,
  pushReservationToRayza,
} from "@/lib/integrations/rayza-connect";
import { staffReservationPatchSchema } from "@/lib/schemas/staff-reservation-patch";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!isValidDashboardKey(key)) {
    return unauthorizedDashboardResponse();
  }

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

    return NextResponse.json({ ok: true, reservation: updated, rayza });
  } catch (error) {
    console.error("[demo/reservations/PATCH]", error);
    const message =
      error instanceof Error ? error.message : "Unable to update reservation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
