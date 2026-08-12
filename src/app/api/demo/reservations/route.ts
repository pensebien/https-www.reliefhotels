import { rooms } from "@/content/site";
import {
  unauthorizedDashboardResponse,
  isValidDashboardKey,
} from "@/lib/dashboard-auth";
import { addPayment, addReservation, updateReservationById } from "@/lib/demo-store";
import { calculateDepositNgn } from "@/lib/booking-deposit";
import { nightsBetween } from "@/lib/booking-search";
import { sendReservationEmail } from "@/lib/email";
import { syncConfirmedReservationToRayza } from "@/lib/integrations/rayza-connect";
import { pushTerminalPayment, pushTransferPayment } from "@/lib/moniepoint";
import { paymentChannelForMethod } from "@/lib/payment-methods";
import { staffReservationSchema } from "@/lib/schemas/staff-reservation";
import {
  frontDeskPaymentReference,
  paymentItemLabel,
} from "@/lib/staff-payment";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!isValidDashboardKey(key)) {
    return unauthorizedDashboardResponse();
  }

  try {
    const body = await request.json();
    const parsed = staffReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reservation data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const room = rooms.find((entry) => entry.id === data.roomId);

    if (!room) {
      return NextResponse.json({ error: "Unknown room" }, { status: 400 });
    }

    const nights = nightsBetween(data.checkIn, data.checkOut);
    const depositNgn =
      data.depositAmountNgn ?? calculateDepositNgn(room.priceFrom, nights);

    const guestNote = data.message?.trim() || "No special requests";
    const message = `Walk-in booking (recorded by staff)\n\n${guestNote}`;

    const stayPreference = [
      `room:${room.id}`,
      room.id,
      `${data.checkIn} → ${data.checkOut}`,
      `${nights} night(s)`,
      `${data.guests} guest(s)`,
    ].join(" · ");

    const collectsDeposit = data.paymentMethod !== "none";
    const awaitsMoniepoint =
      data.paymentMethod === "moniepoint_terminal" ||
      data.paymentMethod === "moniepoint_transfer";

    const reservationStatus = awaitsMoniepoint
      ? "pending"
      : collectsDeposit
        ? "confirmed"
        : data.status;

    let record = await addReservation({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || undefined,
      itemType: "room",
      roomId: room.id,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      nights,
      guests: data.guests,
      stayPreference,
      message,
      status: reservationStatus,
      emailSent: false,
    });

    let paymentReference: string | undefined;
    let paymentPending = false;
    let moniepointPushed = false;

    if (collectsDeposit && data.paymentMethod !== "none") {
      const method = data.paymentMethod;
      paymentReference = frontDeskPaymentReference(method);
      const channel = paymentChannelForMethod(method);

      const paymentStatus = awaitsMoniepoint ? "pending" : "success";

      await addPayment({
        reference: paymentReference,
        reservationId: record.id,
        email: record.email,
        amountKobo: depositNgn * 100,
        currency: "NGN",
        status: paymentStatus,
        itemType: "room",
        itemId: room.id,
        itemLabel: paymentItemLabel(room.id, method),
        paymentMethod: method,
        paymentChannel: channel,
        externalReference: data.transferReference?.trim() || undefined,
      });

      if (method === "moniepoint_terminal") {
        const push = await pushTerminalPayment({
          amountKobo: depositNgn * 100,
          merchantReference: paymentReference,
          paymentMethod: "ANY",
        });
        moniepointPushed = push.accepted;
        paymentPending = true;
      } else if (method === "moniepoint_transfer") {
        const push = await pushTransferPayment({
          amountKobo: depositNgn * 100,
          merchantReference: paymentReference,
        });
        moniepointPushed = push.accepted;
        paymentPending = true;
      }

      if (awaitsMoniepoint) {
        const updated = await updateReservationById(record.id, {
          paymentReference,
        });
        if (updated) record = updated;
      } else {
        const updated = await updateReservationById(record.id, {
          status: "confirmed",
          paymentReference,
        });
        if (updated) record = updated;
      }
    }

    if (record.status === "confirmed") {
      await syncConfirmedReservationToRayza(record);
    }

    const emailSent = await sendReservationEmail(record);
    if (emailSent) {
      const updated = await updateReservationById(record.id, { emailSent: true });
      if (updated) record = updated;
    }

    return NextResponse.json({
      ok: true,
      id: record.id,
      paymentReference,
      paymentMethod: collectsDeposit ? data.paymentMethod : undefined,
      paymentPending,
      moniepointPushed,
      depositNgn: collectsDeposit ? depositNgn : undefined,
      emailSent,
      reservation: record,
    });
  } catch (error) {
    console.error("[demo/reservations]", error);
    const message =
      error instanceof Error ? error.message : "Unable to create reservation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
