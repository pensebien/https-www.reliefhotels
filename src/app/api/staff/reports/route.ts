import { getRoomInventory, listRoomBlocks } from "@/lib/db/inventory-store";
import { listPaymentsForReport, listReservationsForReport } from "@/lib/demo-store";
import { buildHotelReport, reportToCsv } from "@/lib/reports/build";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;

/** Occupancy, revenue, ADR/RevPAR, bookings and payments for [from, to]. `format=csv` downloads it. */
export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  if (!YMD.test(from) || !YMD.test(to) || to < from) {
    return NextResponse.json({ error: "Choose a start and end date (end on or after start)" }, { status: 400 });
  }
  const span = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
  if (span > MAX_DAYS) {
    return NextResponse.json({ error: "Choose a range of one year or less" }, { status: 400 });
  }

  try {
    const [reservations, payments, blocks, inventory] = await Promise.all([
      listReservationsForReport(from, to),
      listPaymentsForReport(from, to),
      listRoomBlocks(),
      getRoomInventory(),
    ]);
    const report = buildHotelReport({ from, to, reservations, payments, blocks, inventory });

    if (searchParams.get("format") === "csv") {
      return new NextResponse(reportToCsv(report), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="relief-report-${from}-to-${to}.csv"`,
        },
      });
    }
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    console.error("[staff/reports]", error);
    return NextResponse.json({ error: "Unable to build the report" }, { status: 500 });
  }
}
