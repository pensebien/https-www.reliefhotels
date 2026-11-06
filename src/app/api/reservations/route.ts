import { guardPublicPost } from "@/lib/rate-limit";
import { rooms } from "@/content/site";
import { syncConfirmedReservationToRayza } from "@/lib/integrations/rayza-sync";
import { reserveRoom } from "@/lib/booking-engine/reserve";
import { addReservation, updateReservationById, type ReservationRecord } from "@/lib/demo-store";
import { sendGuestReservationConfirmation, sendReservationEmail } from "@/lib/email";
import { reservationSchema } from "@/lib/schemas/reservation";
import { amountDueNgn, bookingRef, sendTransferNotifications, transferAccount } from "@/lib/whatsapp-transfer";
import { normalizeWhatsappNumber } from "@/lib/whatsapp-number";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const limited = guardPublicPost(request, "reservations", { limit: 10, windowMs: 600_000 });
  if (limited) return limited;
  try {
    const body = await request.json();
    const parsed = reservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reservation data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    // Checked before a room is held, so a missing account never strands a hold.
    if (data.paymentMode === "transfer" && data.itemType === "room" && !transferAccount()) {
      return NextResponse.json(
        { error: "Bank transfer isn't available right now. Please pay by card or contact the hotel.", code: "transfer_unavailable" },
        { status: 503 },
      );
    }
    const guest = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      stayPreference: data.stayPreference,
      message: data.arrivalTime ? `Estimated arrival: ${data.arrivalTime}\n\n${data.message}` : data.message,
    };

    let record: ReservationRecord;
    let quote: { totalNgn: number; depositNgn: number } | undefined;

    if (data.itemType === "room") {
      const room = rooms.find((r) => r.id === data.roomId || r.slug === data.roomId);
      if (!data.roomId) {
        return NextResponse.json({ error: "Room is required for room reservations" }, { status: 400 });
      }
      if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
      if (!data.checkIn || !data.checkOut) {
        return NextResponse.json({ error: "Check-in and check-out dates are required" }, { status: 400 });
      }

      // Server re-quotes from RAYZA and checks availability atomically with
      // the insert — client nights/prices are never trusted.
      const result = await reserveRoom(
        { roomId: room.id, checkIn: data.checkIn, checkOut: data.checkOut, guests: data.guests, rooms: data.rooms },
        guest,
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
      }
      record = result.record;
      quote = result.quote;
      const whatsappNumber = normalizeWhatsappNumber(data.whatsappNumber ?? "") ?? undefined;
      record =
        (await updateReservationById(record.id, { whatsappNumber, paymentMode: data.paymentMode })) ??
        { ...record, whatsappNumber, paymentMode: data.paymentMode };
    } else {
      record = await addReservation({
        ...guest,
        itemType: data.itemType,
        roomId: data.roomId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        nights: data.nights,
        guests: data.guests,
        emailSent: false,
        status: "pending",
      });
    }

    // Nothing to pay up front (0% deposit): confirm now and hand the booking
    // to RAYZA, instead of holding the room for a payment that never comes.
    const noPaymentNeeded = quote !== undefined && quote.depositNgn <= 0;
    if (noPaymentNeeded) {
      record = (await updateReservationById(record.id, { status: "confirmed" })) ?? { ...record, status: "confirmed" };
      await syncConfirmedReservationToRayza(record);
    }

    // Pay-by-transfer: WhatsApp the guest the account + exact amount, and alert
    // the front desk. Not needed when nothing is due (already confirmed above).
    const transferFlow = data.paymentMode === "transfer" && quote !== undefined && !noPaymentNeeded;
    const account = transferFlow ? transferAccount() : null;
    const whatsapp = transferFlow ? await sendTransferNotifications(record) : null;

    const [sent] = await Promise.all([
      sendReservationEmail(record),
      sendGuestReservationConfirmation(record),
    ]);
    if (sent) {
      record.emailSent = true;
    }

    return NextResponse.json({
      ok: true,
      id: record.id,
      emailSent: sent,
      notified: false,
      demo: !process.env.RESEND_API_KEY,
      noPaymentNeeded,
      ...(transferFlow && account
        ? {
            transfer: {
              ...account,
              reference: bookingRef(record.id),
              amountNgn: amountDueNgn(record),
              whatsappSent: whatsapp?.guest ?? false,
            },
          }
        : {}),
      ...(quote
        ? {
            totalNgn: quote.totalNgn,
            depositNgn: quote.depositNgn,
            holdExpiresAt: record.holdExpiresAt,
          }
        : {}),
    });
  } catch (error) {
    console.error("[reservations]", error);
    return NextResponse.json(
      { error: "Unable to process reservation" },
      { status: 500 },
    );
  }
}
