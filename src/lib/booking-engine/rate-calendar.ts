/**
 * Sirvoy "Rates" grid: per room type and date, the nightly price, rooms left
 * and the rules in force — plus quick edits that write ordinary seasons and
 * restrictions, so the booking engine needs no new pricing concept.
 */

import { countOccupiedUnitsByRoom, getRoomInventory } from "@/lib/db/inventory-store";
import { addDaysToDateString } from "@/lib/booking-search";
import { dayRate, type DayRate } from "./quote";
import { getRateConfig, saveRateConfig, type RateConfig } from "./rate-config";

export type RateCell = DayRate & { date: string; free: number };
export type RateCalendar = { from: string; days: string[]; rooms: { roomId: string; inventory: number; cells: RateCell[] }[] };

export const MAX_CALENDAR_DAYS = 31;

export async function buildRateCalendar(from: string, dayCount: number): Promise<RateCalendar> {
  const n = Math.min(Math.max(1, dayCount), MAX_CALENDAR_DAYS);
  const days = Array.from({ length: n }, (_, i) => addDaysToDateString(from, i));
  const [config, inventory, occupied] = await Promise.all([
    getRateConfig(),
    getRoomInventory(),
    Promise.all(days.map((d) => countOccupiedUnitsByRoom(d, addDaysToDateString(d, 1)))),
  ]);
  return {
    from,
    days,
    rooms: config.rooms.map((policy) => {
      const total = inventory[policy.roomId] ?? 1;
      return {
        roomId: policy.roomId,
        inventory: total,
        cells: days.map((date, i) => ({
          date,
          free: Math.max(0, total - (occupied[i][policy.roomId] ?? 0)),
          ...dayRate(config, policy.roomId, date)!,
        })),
      };
    }),
  };
}

export type RateCalendarEdit = {
  roomId: string;
  from: string;
  /** Exclusive, like a check-out date. */
  to: string;
  /** New nightly price for these nights; omit to leave prices alone. */
  nightlyNgn?: number;
  /** true = stop sale on these nights, false = lift a stop sale set here. */
  closed?: boolean;
};

const editId = (kind: string, e: Pick<RateCalendarEdit, "roomId" | "from" | "to">) => `cal-${kind}-${e.roomId}-${e.from}-${e.to}`;

/** Applies a calendar edit as a season (price) and/or a "closed" restriction; later seasons win. */
export function applyRateCalendarEdit(config: RateConfig, edit: RateCalendarEdit): RateConfig {
  let { seasons, restrictions } = config;
  if (edit.nightlyNgn !== undefined) {
    const id = editId("price", edit);
    seasons = [
      ...seasons.filter((s) => s.id !== id),
      { id, label: `Price ${edit.from} → ${edit.to}`, from: edit.from, to: edit.to, roomIds: [edit.roomId], nightlyNgn: edit.nightlyNgn },
    ];
  }
  if (edit.closed !== undefined) {
    const id = editId("closed", edit);
    restrictions = restrictions.filter((r) => r.id !== id);
    if (edit.closed) {
      restrictions = [
        ...restrictions,
        { id, label: `Stop sale ${edit.from} → ${edit.to}`, from: edit.from, to: edit.to, roomIds: [edit.roomId], mode: "closed" },
      ];
    }
  }
  return { ...config, seasons, restrictions };
}

export async function saveRateCalendarEdit(edit: RateCalendarEdit): Promise<RateConfig> {
  return saveRateConfig(applyRateCalendarEdit(await getRateConfig(), edit));
}
