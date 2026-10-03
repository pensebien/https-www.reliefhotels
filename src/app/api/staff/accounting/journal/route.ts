import { buildJournal, getLedgerAccounts, journalToCsv, unbalancedEntries } from "@/lib/accounting/journal";
import { listPaymentsForReport } from "@/lib/demo-store";
import { listInvoicesInRange } from "@/lib/invoices/store";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Journal lines for invoices and payments on days [from, to]; `format=csv` downloads it. */
export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  if (!YMD.test(from) || !YMD.test(to) || to < from) {
    return NextResponse.json({ error: "Choose a start and end date" }, { status: 400 });
  }
  const [invoices, payments, accounts] = await Promise.all([listInvoicesInRange(from, to), listPaymentsForReport(from, to), getLedgerAccounts()]);
  const lines = buildJournal({ invoices, payments, accounts });
  if (searchParams.get("format") === "csv") {
    return new NextResponse(journalToCsv(lines), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relief-journal-${from}-to-${to}.csv"`,
      },
    });
  }
  return NextResponse.json({ ok: true, lines, unbalanced: unbalancedEntries(lines) });
}
