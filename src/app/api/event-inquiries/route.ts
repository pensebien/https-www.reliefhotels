import { sendEventInquiryEmails } from "@/lib/email";
import { addEventInquiry } from "@/lib/inquiry-store";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
  eventType: z.string().min(1),
  eventDate: z.string().min(1),
  guestCount: z.string().min(1),
  message: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid inquiry" }, { status: 400 });
    }

    const record = await addEventInquiry(parsed.data);
    const { guestSent } = await sendEventInquiryEmails(record);

    return NextResponse.json({
      ok: true,
      id: record.id,
      emailSent: guestSent,
      notified: false,
    });
  } catch {
    return NextResponse.json({ error: "Unable to save inquiry" }, { status: 500 });
  }
}
