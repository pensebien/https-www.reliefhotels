import { sendFeedbackEmail } from "@/lib/email";
import { addGuestFeedback } from "@/lib/inquiry-store";
import { NextResponse } from "next/server";
import { z } from "zod";

const feedbackSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  message: z.string().trim().min(1).max(5000),
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

    const record = await addGuestFeedback(parsed.data);
    const sent = await sendFeedbackEmail(record);

    return NextResponse.json({
      ok: true,
      id: record.id,
      emailSent: sent,
      notified: false,
      demo: !process.env.RESEND_API_KEY,
    });
  } catch (error) {
    console.error("[feedback]", error);
    return NextResponse.json(
      { error: "Unable to process feedback" },
      { status: 500 },
    );
  }
}
