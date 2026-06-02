import { initializePayment } from "@/lib/paystack";
import { rooms, tours } from "@/content/site";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  itemType: z.enum(["room", "tour"]),
  itemId: z.string().min(1),
  nights: z.number().int().min(1).max(30).optional(),
  guests: z.number().int().min(1).max(20).optional(),
  /** Demo-friendly fixed amount in NGN (overrides calculated amount) */
  demoAmountNgn: z.number().int().positive().optional(),
});

function resolveItem(itemType: "room" | "tour", itemId: string) {
  if (itemType === "room") {
    return rooms.find((r) => r.id === itemId || r.slug === itemId);
  }
  return tours.find((t) => t.id === itemId || t.slug === itemId);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { email, itemType, itemId, nights = 1, guests = 1, demoAmountNgn } =
      parsed.data;
    const item = resolveItem(itemType, itemId);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const basePrice = item.priceFrom;
    let amountNgn: number;

    if (demoAmountNgn) {
      amountNgn = demoAmountNgn;
    } else if (itemType === "room") {
      // 20% deposit for demo — industry-standard hold
      amountNgn = Math.round(basePrice * nights * 0.2);
    } else {
      amountNgn = basePrice * guests;
    }

    const amountKobo = amountNgn * 100;
    const itemLabel =
      itemType === "room"
        ? `${itemId} — ${nights} night(s) deposit (20%)`
        : `${itemId} — ${guests} guest(s)`;

    const result = await initializePayment({
      email,
      amountKobo,
      itemType,
      itemId,
      itemLabel,
      metadata: { nights: String(nights), guests: String(guests) },
    });

    return NextResponse.json({
      ok: true,
      reference: result.reference,
      authorizationUrl: result.authorizationUrl,
      amountNgn,
      amountKobo,
      demo: result.demo,
    });
  } catch (error) {
    console.error("[paystack:initialize]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment initialization failed",
      },
      { status: 500 },
    );
  }
}
