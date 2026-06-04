import { addDiningReservation } from "@/lib/inquiry-store";
import { notifyManager } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  venue: z.string().min(1),
  reservationDate: z.string().min(1),
  reservationTime: z.string().min(1),
  partySize: z.string().min(1),
  notes: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reservation" }, { status: 400 });
    }

    const record = await addDiningReservation(parsed.data);
    const notify = await notifyManager({
      event: "dining.reservation.created",
      referenceId: record.id,
      guestName: `${record.firstName} ${record.lastName}`,
      email: record.email,
      summary: `${record.venue}, ${record.partySize} guests, ${record.reservationDate}`,
    });

    return NextResponse.json({ ok: true, id: record.id, notified: notify.sent });
  } catch {
    return NextResponse.json({ error: "Unable to save reservation" }, { status: 500 });
  }
}
