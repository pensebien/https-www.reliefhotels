import { findReservationById } from "@/lib/demo-store";
import { chargeSavedCard, findSavedCard, outstandingBalanceNgn } from "@/lib/saved-cards";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const chargeSchema = z.object({
  amountNgn: z.number().int().positive(),
  reason: z.string().trim().min(3).max(200),
});

/** Saved card summary (brand, last 4, expiry — never the token) and the outstanding balance. */
export async function GET(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const reservation = await findReservationById(id);
  if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  const card = await findSavedCard(id);
  return NextResponse.json({
    ok: true,
    card: card ?? null,
    consent: Boolean(reservation.cardConsent),
    balanceNgn: await outstandingBalanceNgn(reservation),
  });
}

/** Charge the saved card up to the outstanding balance (manager only). */
export async function POST(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const parsed = chargeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a whole-naira amount and a reason" }, { status: 400 });
  }
  try {
    const result = await chargeSavedCard({ reservationId: id, ...parsed.data, staffName: access.session?.name });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[staff/reservations/card POST]", error);
    return NextResponse.json({ error: "Unable to charge the card" }, { status: 500 });
  }
}
