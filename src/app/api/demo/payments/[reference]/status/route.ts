import {
  unauthorizedDashboardResponse,
  isValidDashboardKey,
} from "@/lib/dashboard-auth";
import { syncMoniepointPushPayment } from "@/lib/moniepoint-sync";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ reference: string }> },
) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!isValidDashboardKey(key)) {
    return unauthorizedDashboardResponse();
  }

  const { reference } = await context.params;

  try {
    const result = await syncMoniepointPushPayment(reference);
    if ("reason" in result) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      reference,
      status: result.status,
      payment: result.payment,
      moniepoint: result.moniepoint,
    });
  } catch (error) {
    console.error("[demo/payments/status]", error);
    return NextResponse.json(
      { error: "Unable to check payment status" },
      { status: 500 },
    );
  }
}
