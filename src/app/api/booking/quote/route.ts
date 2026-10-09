import { guardPublicPost } from "@/lib/rate-limit";
import { quoteStayLive } from "@/lib/booking-engine/quote";
import { NextResponse } from "next/server";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const quoteRequestSchema = z.object({
  roomId: z.string().min(1).max(100),
  checkIn: dateSchema,
  checkOut: dateSchema,
  guests: z.number().int().min(1).max(20),
  rooms: z.number().int().min(1).max(4).optional(),
});

export async function POST(request: Request) {
  const limited = guardPublicPost(request, "quote", { limit: 120, windowMs: 600_000 });
  if (limited) return limited;
  const parsed = quoteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quote request", details: parsed.error.flatten() }, { status: 400 });
  }

  const quote = await quoteStayLive(parsed.data);
  if (!quote.ok) {
    return NextResponse.json(
      { error: quote.message, code: quote.code },
      { status: quote.code === "rayza_unavailable" ? 503 : 422 },
    );
  }
  return NextResponse.json(quote);
}
