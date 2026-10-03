import { issueCreditNoteFor } from "@/lib/invoices/service";
import { InvoiceStoreError } from "@/lib/invoices/store";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({ reason: z.string().trim().min(3).max(300) });

/** Reverse an invoice in full (manager only). */
export async function POST(request: Request, context: RouteContext) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Give a reason for the credit note" }, { status: 400 });
  }
  try {
    const result = await issueCreditNoteFor(id, parsed.data.reason);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, invoice: result.invoice });
  } catch (error) {
    if (error instanceof InvoiceStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[staff/invoices/credit-note]", error);
    return NextResponse.json({ error: "Unable to issue credit note" }, { status: 500 });
  }
}
