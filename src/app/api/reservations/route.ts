import { addReservation } from "@/lib/demo-store";
import { sendReservationEmail } from "@/lib/email";
import { notifyManager } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const reservationSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  stayPreference: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  itemType: z.enum(["room", "tour", "inquiry"]).default("room"),
  roomId: z.string().max(100).optional(),
  checkIn: dateSchema.optional(),
  checkOut: dateSchema.optional(),
  guests: z.number().int().min(1).max(20).default(1),
  nights: z.number().int().min(1).max(30).optional(),
});

function buildSummary(data: z.infer<typeof reservationSchema>): string {
  const parts = [data.stayPreference];
  if (data.checkIn && data.checkOut) {
    parts.push(`${data.checkIn} → ${data.checkOut}`);
  } else if (data.nights) {
    parts.push(`${data.nights} night(s)`);
  }
  parts.push(`${data.guests} guest(s)`);
  return parts.join(" · ");
}

export async function POST(request: Request) {
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

    const record = await addReservation({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      itemType: data.itemType,
      roomId: data.roomId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      nights: data.nights,
      guests: data.guests,
      stayPreference: data.stayPreference,
      message: data.message,
      emailSent: false,
      status: "pending",
    });

    const sent = await sendReservationEmail(record);
    if (sent) {
      record.emailSent = true;
    }

    const notify = await notifyManager({
      event: "reservation.created",
      referenceId: record.id,
      guestName: `${record.firstName} ${record.lastName}`,
      email: record.email,
      phone: record.phone,
      summary: buildSummary(data),
    });

    return NextResponse.json({
      ok: true,
      id: record.id,
      emailSent: sent,
      notified: notify.sent,
      demo: !process.env.RESEND_API_KEY,
    });
  } catch (error) {
    console.error("[reservations]", error);
    return NextResponse.json(
      { error: "Unable to process reservation" },
      { status: 500 },
    );
  }
}
