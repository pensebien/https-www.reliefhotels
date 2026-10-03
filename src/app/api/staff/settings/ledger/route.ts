import { ACCOUNT_NAMES, getLedgerAccounts, saveLedgerAccounts } from "@/lib/accounting/journal";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  return NextResponse.json({ ok: true, accounts: await getLedgerAccounts(), names: ACCOUNT_NAMES });
}

export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  try {
    return NextResponse.json({ ok: true, accounts: await saveLedgerAccounts(await request.json()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid accounts" }, { status: 400 });
  }
}
