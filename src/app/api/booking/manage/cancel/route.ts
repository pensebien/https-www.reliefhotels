import { guardPublicPost } from "@/lib/rate-limit";
import { loadManagedBooking } from "@/lib/booking-engine/manage-service";
import { syncCancelledReservationsToRayza } from "@/lib/integrations/rayza-sync";
import { updateReservationById } from "@/lib/demo-store";
import { sendGuestCancellationEmails } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const limited = guardPublicPost(request, "manage", { limit: 20, windowMs: 600_000 });
  if (limited) return limited;
  const result = await loadManagedBooking(await request.json().catch(() => null));
  if (!result.ok) return result.response;

  const { reservation, members, view } = result.booking;
  if (!view.canCancel) {
    return NextResponse.json(
      { error: "This booking can no longer be cancelled online. Please contact the hotel." },
      { status: 409 },
    );
  }

  try {
    const cancelledAt = new Date().toISOString();
    const updated = await updateReservationById(reservation.id, {
      status: "cancelled",
      cancelledAt,
      staffNotes: [
        `Cancelled by guest online ${cancelledAt}.` +
          (view.paidNgn > 0
            ? ` Paid ₦${view.paidNgn.toLocaleString("en-NG")}; refund due ₦${view.refundIfCancelledNgn.toLocaleString("en-NG")}.`
            : ""),
        reservation.staffNotes,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    if (!updated) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    // A group booking is cancelled as a whole.
    const others = await Promise.all(
      members
        .filter((m) => m.id !== reservation.id && m.status !== "cancelled")
        .map((m) =>
          updateReservationById(m.id, {
            status: "cancelled",
            cancelledAt,
            staffNotes: [`Cancelled by guest online with group ${reservation.id}.`, m.staffNotes]
              .filter(Boolean)
              .join("\n"),
          }),
        ),
    );

    // Free the rooms in RAYZA HMS too; failures are retried by the scheduled sync.
    await syncCancelledReservationsToRayza([updated, ...others.flatMap((m) => (m ? [m] : []))]);

    await sendGuestCancellationEmails(updated, {
      paidNgn: view.paidNgn,
      refundNgn: view.refundIfCancelledNgn,
    });

    return NextResponse.json({
      ok: true,
      status: "cancelled",
      refundNgn: view.refundIfCancelledNgn,
    });
  } catch (error) {
    console.error("[booking/manage/cancel]", error);
    return NextResponse.json({ error: "Unable to cancel booking" }, { status: 500 });
  }
}
