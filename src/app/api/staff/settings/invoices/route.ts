import {
  getInvoiceSettings,
  InvoiceSettingsValidationError,
  saveInvoiceSettings,
} from "@/lib/invoices/settings";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  return NextResponse.json({ ok: true, settings: await getInvoiceSettings() });
}

export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  try {
    const settings = await saveInvoiceSettings(await request.json());
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof InvoiceSettingsValidationError) {
      return NextResponse.json({ error: "Invalid invoice settings", issues: error.issues }, { status: 400 });
    }
    console.error("[staff/settings/invoices PUT]", error);
    return NextResponse.json({ error: "Unable to save invoice settings" }, { status: 500 });
  }
}
