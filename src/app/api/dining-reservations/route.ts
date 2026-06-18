import { addDiningReservation } from "@/lib/inquiry-store";
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

    return NextResponse.json({ ok: true, id: record.id, notified: false });
  } catch {
    return NextResponse.json({ error: "Unable to save reservation" }, { status: 500 });
  }
}
