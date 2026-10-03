import { InvoiceStoreError, listInvoicesForReservation } from "@/lib/invoices/store";
import { issueInvoiceForReservation } from "@/lib/invoices/service";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const invoices = await listInvoicesForReservation(id);
  return NextResponse.json({
    ok: true,
    invoices: invoices.map(({ document: _document, ...summary }) => summary),
  });
}

/** Issue an invoice for the booking as it stands now. */
export async function POST(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  try {
    const result = await issueInvoiceForReservation(id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, invoice: result.invoice });
  } catch (error) {
    if (error instanceof InvoiceStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[staff/reservations/invoices POST]", error);
    return NextResponse.json({ error: "Unable to issue invoice" }, { status: 500 });
  }
}
