import {
  isValidDashboardKey,
  unauthorizedDashboardResponse,
} from "@/lib/dashboard-auth";
import { getCashierSettleStatus } from "@/lib/cashier/settle-service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? request.headers.get("x-demo-key");

  if (!isValidDashboardKey(key)) {
    return unauthorizedDashboardResponse();
  }

  const reference = searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  const demoOverride = searchParams.get("demo") === "1";

  try {
    const result = await getCashierSettleStatus(reference, { demoOverride });

    if (!result) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      payment: result.payment,
      reservation: result.reservation,
    });
  } catch (error) {
    console.error("[staff/cashier/settle/status]", error);
    const message =
      error instanceof Error ? error.message : "Unable to load settle status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
