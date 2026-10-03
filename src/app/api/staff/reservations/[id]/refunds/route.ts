import { listRefundablePayments, refundPayment } from "@/lib/refunds";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const refundSchema = z.object({
  paymentReference: z.string().min(1).max(100),
  amountNgn: z.number().int().positive(),
  reason: z.string().trim().min(3).max(200),
});

/** Payments on the booking with what can still be refunded, plus past refunds. */
export async function GET(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  return NextResponse.json({ ok: true, ...(await listRefundablePayments(id)) });
}

/** Refund part or all of one payment (manager only). */
export async function POST(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const parsed = refundSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a payment, a whole-naira amount and a reason" }, { status: 400 });
  }
  try {
    const result = await refundPayment({
      reservationId: id,
      ...parsed.data,
      staffName: access.session?.name,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[staff/reservations/refunds POST]", error);
    return NextResponse.json({ error: "Unable to record the refund" }, { status: 500 });
  }
}
