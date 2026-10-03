import { quoteGroup } from "@/lib/booking-engine/group";
import { getRateConfig } from "@/lib/booking-engine/rate-config";
import { countCouponRedemptions, quoteStayLive } from "@/lib/booking-engine/reserve";
import { NextResponse } from "next/server";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const quoteRequestSchema = z.object({
  roomId: z.string().min(1).max(100),
  checkIn: dateSchema,
  checkOut: dateSchema,
  guests: z.number().int().min(1).max(20),
  rooms: z.number().int().min(1).max(4).optional(),
  couponCode: z.string().trim().max(40).optional(),
  extraIds: z.array(z.string().max(60)).max(20).optional(),
  /** Group booking: several room types, same dates; first line is the lead. */
  stays: z
    .array(z.object({ roomId: z.string().min(1).max(100), rooms: z.number().int().min(1).max(4) }))
    .min(1)
    .max(4)
    .optional(),
});

export async function POST(request: Request) {
  const parsed = quoteRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid quote request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (input.stays && input.stays.length > 1) {
    const couponRedemptions = input.couponCode ? await countCouponRedemptions(input.couponCode) : 0;
    const group = quoteGroup({ ...input, stays: input.stays, couponRedemptions }, await getRateConfig());
    if (!group.ok) {
      return NextResponse.json({ error: group.message, code: group.code }, { status: 422 });
    }
    return NextResponse.json(group);
  }

  const quote = await quoteStayLive(input);
  if (!quote.ok) {
    return NextResponse.json(
      { error: quote.message, code: quote.code },
      { status: 422 },
    );
  }
  return NextResponse.json(quote);
}
