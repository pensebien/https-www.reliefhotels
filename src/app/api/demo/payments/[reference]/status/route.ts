import { findPaymentByReference } from "@/lib/demo-store";
import { syncMoniepointPushPayment } from "@/lib/moniepoint-sync";
import { syncPaystackTerminalPayment } from "@/lib/paystack-terminal";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ reference: string }> },
) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;

  const { reference } = await context.params;

  try {
    const payment = await findPaymentByReference(reference);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.paymentMethod === "paystack_terminal") {
      const updated = await syncPaystackTerminalPayment(reference);
      if (!updated) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        reference,
        status: updated.status,
        payment: updated,
      });
    }

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
