import { isValidInvoiceToken } from "@/lib/booking-engine/manage-link";
import { findInvoiceById } from "@/lib/invoices/store";
import { NextResponse } from "next/server";

/** Guest view of one invoice via its signed link. Bad links all get the same 404. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const notFound = NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!/^[0-9a-f-]{36}$/i.test(id) || !isValidInvoiceToken(id, searchParams.get("t"))) {
    return notFound;
  }
  const invoice = await findInvoiceById(id);
  if (!invoice) return notFound;
  return NextResponse.json({ ok: true, invoice });
}
