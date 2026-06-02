import { addReservation } from "@/lib/demo-store";
import { sendReservationEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import { z } from "zod";

const reservationSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(254),
  stayPreference: z.string().min(1).max(64),
  message: z.string().min(1).max(5000),
});

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

    const record = await addReservation({
      ...parsed.data,
      emailSent: false,
      status: "pending",
    });

    const sent = await sendReservationEmail(record);
    if (sent) {
      record.emailSent = true;
    }

    return NextResponse.json({
      ok: true,
      id: record.id,
      emailSent: sent,
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
