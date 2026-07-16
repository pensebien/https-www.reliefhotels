import {
  isValidDashboardKey,
  unauthorizedDashboardResponse,
} from "@/lib/dashboard-auth";
import { settleCashierPayment } from "@/lib/cashier/settle-service";
import { cashierSettleSchema } from "@/lib/schemas/cashier-settle";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? request.headers.get("x-demo-key");

  if (!isValidDashboardKey(key)) {
    return unauthorizedDashboardResponse();
  }

  try {
    const body = await request.json();
    const parsed = cashierSettleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid settle request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await settleCashierPayment(parsed.data);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      paymentId: result.paymentId,
      reference: result.reference,
      status: result.status,
      provider: result.provider,
      demo: result.demo,
      idempotentReplay: result.idempotentReplay ?? false,
      reservation: result.reservation,
      payment: result.payment,
    });
  } catch (error) {
    console.error("[staff/cashier/settle]", error);
    const message =
      error instanceof Error ? error.message : "Unable to settle payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
