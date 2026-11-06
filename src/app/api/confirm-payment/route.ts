import { isValidConfirmToken } from "@/lib/booking-engine/confirm-link";
import { findReservationById } from "@/lib/demo-store";
import { guardPublicPost } from "@/lib/rate-limit";
import { recordTransferReceived } from "@/lib/staff-ops";
import { frontDeskNumber } from "@/lib/whatsapp-transfer";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  id: z.string().min(1).max(64),
  t: z.string().min(1).max(128),
  amountNgn: z.number().int().min(1).max(100_000_000),
  moniepointRef: z.string().trim().max(64).optional(),
});

/** The desk taps "I have received the payment" on the link sent to their WhatsApp. */
export async function POST(request: Request) {
  const limited = guardPublicPost(request, "confirm-payment", { limit: 20, windowMs: 600_000 });
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { id, t, amountNgn, moniepointRef } = parsed.data;

  let valid = false;
  try {
    valid = isValidConfirmToken(id, t);
  } catch {
    // No signing secret configured: nothing can be valid.
  }
  if (!valid) return NextResponse.json({ error: "This confirmation link is not valid" }, { status: 403 });

  const reservation = await findReservationById(id);
  if (!reservation || reservation.itemType !== "room") return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  // The first tap wins; a second tap must not record the money twice.
  if (reservation.status === "confirmed") return NextResponse.json({ error: "This booking is already confirmed" }, { status: 409 });

  const desk = frontDeskNumber();
  const result = await recordTransferReceived(id, amountNgn, `WhatsApp link (CS${desk ? ` +${desk}` : ""})`, moniepointRef);
  return result.ok
    ? NextResponse.json({ ok: true, message: result.message })
    : NextResponse.json({ error: result.error }, { status: result.status });
}
