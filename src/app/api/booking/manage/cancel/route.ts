import { loadManagedBooking } from "@/lib/booking-engine/manage-service";
import { updateReservationById } from "@/lib/demo-store";
import { sendGuestCancellationEmails } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const result = await loadManagedBooking(await request.json().catch(() => null));
  if (!result.ok) return result.response;

  const { reservation, view } = result.booking;
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
