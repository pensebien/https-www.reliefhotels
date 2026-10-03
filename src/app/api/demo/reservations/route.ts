import { rooms } from "@/content/site";
import { emitBookingEvent } from "@/lib/integrations/webhooks";
import { OVERRIDABLE_RULE_CODES, type QuoteErrorCode } from "@/lib/booking-engine/quote";
import { reserveRoom } from "@/lib/booking-engine/reserve";
import {
  addPayment,
  findPaymentByReference,
  updateReservationById,
} from "@/lib/demo-store";
import { nightsBetween } from "@/lib/booking-search";
import { sendReservationEmail } from "@/lib/email";
import { syncConfirmedReservationToRayza } from "@/lib/integrations/rayza-connect";
import { pushTerminalPayment, pushTransferPayment } from "@/lib/moniepoint";
import { handlePaymentConfirmed } from "@/lib/payment-confirmed";
import { paymentChannelForMethod } from "@/lib/payment-methods";
import { createPaystackTerminalSettlement } from "@/lib/paystack-terminal";
import { staffReservationSchema } from "@/lib/schemas/staff-reservation";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { pluralize } from "@/lib/utils";
import {
  frontDeskPaymentReference,
  paymentItemLabel,
} from "@/lib/staff-payment";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;

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

    const guestNote = data.message?.trim() || "No special requests";
    const message = [
      "Walk-in booking (recorded by staff)",
      data.overrideRules ? "Stay rules overridden by staff." : null,
      "",
      guestNote,
    ]
      .filter((line) => line !== null)
      .join("\n");

    const stayPreference = [
      `room:${room.id}`,
      room.id,
      `${data.checkIn} → ${data.checkOut}`,
      pluralize(nights, "night"),
      pluralize(data.guests, "guest"),
    ].join(" · ");

    const collectsDeposit = data.paymentMethod !== "none";
    const awaitsProviderPush =
      data.paymentMethod === "moniepoint_terminal" ||
      data.paymentMethod === "moniepoint_transfer" ||
      data.paymentMethod === "paystack_terminal";

    const reservationStatus = awaitsProviderPush
      ? "pending"
      : collectsDeposit
        ? "confirmed"
        : data.status;

    // Same engine as online checkout: priced from the rate rules and
    // checked-and-inserted atomically, so the desk can't double-book a room.
    // Staff may override stay rules (capacity, min stay, closed dates) —
    // never availability. Desk bookings keep holding the room until staff
    // change their status, so no expiring hold.
    const reserved = await reserveRoom(
      {
        roomId: room.id,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
        ignoreRestrictions: data.overrideRules,
      },
      {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || undefined,
        stayPreference,
        message,
      },
      { status: reservationStatus, expiringHold: false, channel: "desk" },
    );

    if (!reserved.ok) {
      return NextResponse.json(
        {
          error: reserved.message,
          code: reserved.code,
          overridable: OVERRIDABLE_RULE_CODES.includes(reserved.code as QuoteErrorCode),
        },
        { status: reserved.status },
      );
    }

    let record = reserved.record;
    const depositNgn = data.depositAmountNgn ?? reserved.quote.depositNgn;

    let paymentReference: string | undefined;
    let paymentPending = false;
    let pushAccepted = false;

    if (collectsDeposit && data.paymentMethod !== "none") {
      const method = data.paymentMethod;
      paymentReference = frontDeskPaymentReference(method);
      const channel = paymentChannelForMethod(method);

      const paymentStatus = awaitsProviderPush ? "pending" : "success";

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
        pushAccepted = push.accepted;
        paymentPending = true;
      } else if (method === "moniepoint_transfer") {
        const push = await pushTransferPayment({
          amountKobo: depositNgn * 100,
          merchantReference: paymentReference,
        });
        pushAccepted = push.accepted;
        paymentPending = true;
      } else if (method === "paystack_terminal") {
        await createPaystackTerminalSettlement({
          email: record.email,
          name: `${record.firstName} ${record.lastName}`,
          amountKobo: depositNgn * 100,
          reference: paymentReference,
          description: paymentItemLabel(room.id, method),
        });
        pushAccepted = true;
        paymentPending = true;
      }

      if (awaitsProviderPush) {
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
      // Cash (or any non-pending) deposit actually collects money — send the
      // guest a receipt and alert the manager, same as the online checkout
      // path already does. "No deposit yet" confirms with no payment to
      // reference, so it only needs the RAYZA sync.
      const collectedPayment =
        collectsDeposit && !awaitsProviderPush && paymentReference
          ? await findPaymentByReference(paymentReference)
          : null;

      if (collectedPayment) {
        await handlePaymentConfirmed(collectedPayment, record);
      } else {
        await syncConfirmedReservationToRayza(record);
      }
    }

    await emitBookingEvent("booking.created", record);

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
      pushAccepted,
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
