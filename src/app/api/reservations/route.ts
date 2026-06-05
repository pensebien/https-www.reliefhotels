import { addReservation } from "@/lib/demo-store";
import { sendReservationEmail } from "@/lib/email";
import { notifyManager } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { z } from "zod";

const feedbackSchema = z.object({
  message: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid feedback data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const record = await addReservation({
      firstName: "Feedback",
      lastName: "Guest",
      email: "feedback@reliefhotelsandsuites.com",
      stayPreference: "feedback",
      message: parsed.data.message,
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
      summary: `Feedback: ${record.message.slice(0, 120)}`,
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
