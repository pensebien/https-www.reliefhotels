import { manuallyConfirmPendingPayment } from "@/lib/staff-payment-confirm";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;

  try {
    const body = await request.json().catch(() => null);
    const reference = typeof body?.reference === "string" ? body.reference : "";

    if (!reference) {
      return NextResponse.json({ error: "reference is required" }, { status: 400 });
    }

    const result = await manuallyConfirmPendingPayment(reference);

    if (!result.ok) {
      const status = result.reason === "not_found" ? 404 : 409;
      const error =
        result.reason === "not_found"
          ? "Payment not found"
          : result.reason === "not_pending"
            ? "Payment is not pending — nothing to confirm"
            : "This payment method can't be manually confirmed";
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({
      ok: true,
      reference,
      status: result.payment.status,
      payment: result.payment,
    });
  } catch (error) {
    console.error("[staff/cashier/settle/confirm]", error);
    return NextResponse.json(
      { error: "Unable to confirm payment" },
      { status: 500 },
    );
  }
}
