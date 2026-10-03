import { buildInvoiceUrl } from "@/lib/booking-engine/manage-link";
import { findInvoiceById } from "@/lib/invoices/store";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const invoice = await findInvoiceById(id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  return NextResponse.json({ ok: true, invoice, guestUrl: buildInvoiceUrl(invoice.id) });
}
