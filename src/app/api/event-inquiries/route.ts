import { addEventInquiry } from "@/lib/inquiry-store";
import { notifyManager } from "@/lib/notifications";
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
    const notify = await notifyManager({
      event: "event.inquiry.created",
      referenceId: record.id,
      guestName: `${record.firstName} ${record.lastName}`,
      email: record.email,
      phone: record.phone,
      summary: `${record.eventType}, ${record.guestCount} guests, ${record.eventDate}`,
    });

    return NextResponse.json({ ok: true, id: record.id, notified: notify.sent });
  } catch {
    return NextResponse.json({ error: "Unable to save inquiry" }, { status: 500 });
  }
}
