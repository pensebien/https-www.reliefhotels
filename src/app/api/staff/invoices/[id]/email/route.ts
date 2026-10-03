import { findInvoiceById } from "@/lib/invoices/store";
import { sendInvoiceEmail } from "@/lib/email";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** Email the guest a link to this invoice or credit note. */
export async function POST(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const invoice = await findInvoiceById(id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const sent = await sendInvoiceEmail(invoice);
  return NextResponse.json({ ok: true, sent, demo: !sent });
}
