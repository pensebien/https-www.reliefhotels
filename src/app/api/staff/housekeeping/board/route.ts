import { listReservationsForReport } from "@/lib/demo-store";
import { buildHousekeepingBoard } from "@/lib/housekeeping/board";
import { listRoomStatus, listTasksDone } from "@/lib/housekeeping/store";
import { getHousekeepingTasks } from "@/lib/housekeeping/tasks";
import { lagosToday } from "@/lib/guest-messages/render";
import { buildInventoryUnits } from "@/lib/inventory-units";
import { getRoomSetup } from "@/lib/room-setup";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

/** Every room for a day: guest movement, clean/dirty, tasks due. */
export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["cleaner_head", "manager"]);
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? lagosToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const before = new Date(`${date}T00:00:00Z`);
  before.setUTCDate(before.getUTCDate() - 1);

  const [setup, reservations, statuses, tasks, done] = await Promise.all([
    getRoomSetup(),
    // From the day before, so guests checking out on `date` are included.
    listReservationsForReport(before.toISOString().slice(0, 10), date),
    listRoomStatus(),
    getHousekeepingTasks(),
    listTasksDone(date),
  ]);
  const units = buildInventoryUnits(
    Object.fromEntries(setup.rooms.map((r) => [r.roomId, { inventory: r.inventory, unitLabels: r.unitLabels }])),
  );
  const board = buildHousekeepingBoard({ date, units, reservations, statuses, tasks, done });
  return NextResponse.json({ ok: true, date, rooms: board });
}
