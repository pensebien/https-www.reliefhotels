/**
 * Today's housekeeping board: every physical room with its guest movement
 * (arriving, leaving, staying over, vacant), clean/dirty status and the
 * tasks due. Rooms are placed exactly as on the staff calendar.
 */

import type { CalendarReservation } from "@/lib/inventory-calendar";
import { assignBookingsToUnits, reservationToBookings } from "@/lib/inventory-calendar";
import type { InventoryUnit } from "@/lib/inventory-units";
import type { RoomStatus, TaskDone } from "./store";
import type { HousekeepingTask } from "./tasks";

export type Movement = "arriving" | "departing" | "turnover" | "stayover" | "vacant";

export type BoardRoom = {
  unitId: string;
  roomId: string;
  label: string;
  movement: Movement;
  guestName?: string;
  reservationId?: string;
  nightOfStay?: number;
  status: "clean" | "dirty";
  tasks: { id: string; name: string; done: boolean }[];
};

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

export function buildHousekeepingBoard(input: {
  date: string;
  units: InventoryUnit[];
  reservations: CalendarReservation[];
  statuses: RoomStatus[];
  tasks: HousekeepingTask[];
  done: TaskDone[];
}): BoardRoom[] {
  const roomUnits = input.units.filter((u) => u.kind === "room");
  const live = input.reservations.filter(
    (r) => r.status !== "cancelled" && r.checkIn && r.checkOut && r.checkIn <= input.date && r.checkOut >= input.date,
  );
  const placed = assignBookingsToUnits(live.flatMap(reservationToBookings), roomUnits);
  const statusOf = new Map(input.statuses.map((s) => [s.unitId, s.status]));
  const active = input.tasks.filter((t) => t.active);

  return roomUnits.map((unit) => {
    const here = placed.filter((b) => b.unitId === unit.id);
    const leaving = here.find((b) => b.checkOut === input.date);
    const arriving = here.find((b) => b.checkIn === input.date);
    const staying = here.find((b) => b.checkIn < input.date && b.checkOut > input.date);
    const movement: Movement = leaving && arriving
      ? "turnover"
      : leaving
        ? "departing"
        : arriving
          ? "arriving"
          : staying
            ? "stayover"
            : "vacant";
    const guest = arriving ?? staying ?? leaving;
    const nightOfStay = staying ? daysBetween(staying.checkIn, input.date) : undefined;

    const due = active.filter((task) => {
      if (task.on === "departure") return movement === "departing" || movement === "turnover";
      if (task.on === "arrival") return movement === "arriving" || movement === "turnover";
      return movement === "stayover" && nightOfStay !== undefined && nightOfStay % task.everyNights === 0;
    });

    return {
      unitId: unit.id,
      roomId: unit.roomId,
      label: unit.unitLabel ?? String(unit.unitIndex),
      movement,
      guestName: guest?.guestName,
      reservationId: guest?.id,
      nightOfStay,
      status: statusOf.get(unit.id) ?? "clean",
      tasks: due.map((task) => ({
        id: task.id,
        name: task.name,
        done: input.done.some((d) => d.unitId === unit.id && d.taskId === task.id),
      })),
    };
  });
}
