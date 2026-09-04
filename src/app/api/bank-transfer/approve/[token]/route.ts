import { verifyBankTransferApprovalToken } from "@/lib/bank-transfer-link";
import { findPaymentByReference, findReservationById } from "@/lib/demo-store";
import { manuallyConfirmPendingPayment } from "@/lib/staff-payment-confirm";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

/**
 * GET is safe — it only decodes the token and reports what it finds, never
 * mutates anything. This matters: mail clients and security gateways often
 * prefetch/scan links in emails, which would silently "click" a bare
 * mutating link before a human ever sees it. Approval is a separate POST,
 * gated by both the token and an authenticated staff session/key.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const decoded = verifyBankTransferApprovalToken(token);
  if (!decoded) {
    return NextResponse.json(
      { ok: false, error: "This link is invalid or has expired." },
      { status: 400 },
    );
  }

  const payment = await findPaymentByReference(decoded.reference);
  if (!payment || payment.paymentMethod !== "bank_transfer_manual") {
    return NextResponse.json(
      { ok: false, error: "No matching bank transfer found." },
      { status: 404 },
    );
  }

  const reservation = payment.reservationId
    ? await findReservationById(payment.reservationId)
    : undefined;

  return NextResponse.json({
    ok: true,
    reference: payment.reference,
    guestName: reservation
      ? `${reservation.firstName} ${reservation.lastName}`
      : undefined,
    amountKobo: payment.amountKobo,
    itemLabel: payment.itemLabel,
    status: payment.status,
  });
}

/**
 * Approval requires *both* the token and an authenticated staff context — a
 * leaked/forwarded link alone cannot approve anything. Re-validates the live
 * payment server-side rather than trusting the token's payload as data.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;

  const { token } = await context.params;
  const decoded = verifyBankTransferApprovalToken(token);
  if (!decoded) {
    return NextResponse.json(
      { ok: false, error: "This link is invalid or has expired." },
      { status: 400 },
    );
  }

  const payment = await findPaymentByReference(decoded.reference);
  if (!payment || payment.paymentMethod !== "bank_transfer_manual") {
    return NextResponse.json(
      { ok: false, error: "No matching bank transfer found." },
      { status: 404 },
    );
  }

  const result = await manuallyConfirmPendingPayment(decoded.reference);
  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 409;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }

  return NextResponse.json({
    ok: true,
    reference: result.payment.reference,
    status: result.payment.status,
  });
}
