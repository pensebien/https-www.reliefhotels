import { loadManagedBooking } from "@/lib/booking-engine/manage-service";
import { updateReservationById } from "@/lib/demo-store";
import { deleteSavedCard } from "@/lib/saved-cards";
import { NextResponse } from "next/server";

/** Guest removes their saved card (withdraws consent) from the manage link. */
export async function POST(request: Request) {
  const result = await loadManagedBooking(await request.json().catch(() => null));
  if (!result.ok) return result.response;
  const lead = result.booking.members[0];
  await deleteSavedCard(lead.id);
  await updateReservationById(lead.id, { cardConsent: false });
  return NextResponse.json({ ok: true });
}
