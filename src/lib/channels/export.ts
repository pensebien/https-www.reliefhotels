import { rooms } from "@/content/site";
import { getRoomInventory, listRoomBlocks } from "@/lib/db/inventory-store";
import { holdsInventory, listReservationsForReport } from "@/lib/demo-store";
import { lagosToday } from "@/lib/guest-messages/render";
import { eachDay } from "@/lib/reports/build";

/**
 * Days in the next `horizonDays` when every room of this type is taken
 * (bookings still holding inventory + blocks, including other channels'),
 * i.e. what an OTA should show as unavailable.
 */
export async function fullyBookedDays(roomId: string, horizonDays = 365, now = Date.now()): Promise<string[]> {
  if (!rooms.some((r) => r.id === roomId)) return [];
  const from = lagosToday(now);
  const end = new Date(`${from}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + horizonDays - 1);
  const to = end.toISOString().slice(0, 10);

  const [inventory, reservations, blocks] = await Promise.all([
    getRoomInventory(),
    listReservationsForReport(from, to),
    listRoomBlocks(),
  ]);
  const total = inventory[roomId] ?? 1;
  const used = new Map<string, number>();
  const add = (checkIn: string, checkOut: string, units: number) => {
    for (const day of eachDay(checkIn, new Date(Date.parse(`${checkOut}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10))) {
      if (day >= from && day <= to) used.set(day, (used.get(day) ?? 0) + units);
    }
  };
  for (const r of reservations) {
    if (r.itemType === "room" && r.roomId === roomId && r.checkIn && r.checkOut && holdsInventory(r, now)) {
      add(r.checkIn, r.checkOut, r.units ?? 1);
    }
  }
  for (const b of blocks) if (b.roomId === roomId) add(b.checkIn, b.checkOut, 1);
  return [...used.entries()].filter(([, n]) => n >= total).map(([day]) => day);
}
