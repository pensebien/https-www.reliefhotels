/**
 * Hotel performance report over [from, to] (inclusive days), modelled on
 * Sirvoy's Statistics page. Pure: callers pass the reservations, payments,
 * room blocks and inventory.
 *
 * - A stay counts as booked when it holds inventory (confirmed, checked out,
 *   or pending with an active hold).
 * - Each night carries its locked nightly rate; long-stay and promo
 *   discounts and extras are spread evenly over the stay's nights. Only
 *   nights inside the range count.
 * - Available room-nights = inventory × days − blocked nights.
 */

import { rooms } from "@/content/site";
import type { RoomBlock } from "@/lib/db/inventory-store";
import {
  bookingChannelOf,
  holdsInventory,
  type PaymentRecord,
  type ReservationRecord,
} from "@/lib/demo-store";

export type DailyPoint = {
  date: string;
  occupiedRooms: number;
  availableRooms: number;
  blockedRooms: number;
  guests: number;
};

export type HotelReport = {
  from: string;
  to: string;
  days: number;
  keyMetrics: {
    totalRevenueNgn: number;
    roomRevenueNgn: number;
    extrasRevenueNgn: number;
    adrNgn: number;
    revparNgn: number;
  };
  occupancy: {
    occupancyPct: number;
    roomNightsSold: number;
    roomNightsAvailable: number;
    guestNights: number;
    guests: number;
  };
  bookingsCreated: {
    count: number;
    online: number;
    desk: number;
    cancelled: number;
    cancellationPct: number;
    /** Median days between booking and arrival (robust to a few far-ahead bookings). */
    medianLeadDays: number;
  };
  byRoomType: { roomId: string; roomNights: number; revenueNgn: number; occupancyPct: number }[];
  paymentsByMethod: { method: string; amountNgn: number; count: number }[];
  daily: DailyPoint[];
};

const DAY = 86_400_000;

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

function stayNights(r: ReservationRecord): string[] {
  if (!r.checkIn || !r.checkOut) return [];
  return eachDay(r.checkIn, new Date(Date.parse(`${r.checkOut}T00:00:00Z`) - DAY).toISOString().slice(0, 10));
}

/** Room and extras revenue for each night of the stay (all rooms of the line). */
function nightlyRevenue(r: ReservationRecord): Map<string, { room: number; extras: number }> {
  const nights = stayNights(r);
  const units = r.units ?? 1;
  const map = new Map<string, { room: number; extras: number }>();
  if (nights.length === 0) return map;
  const q = r.quoteSnapshot;
  if (q) {
    const discount = (q.longStayDiscountNgn + q.couponDiscountNgn) / nights.length;
    const extras = q.extrasTotalNgn / nights.length;
    for (const night of q.perNight) {
      map.set(night.date, { room: night.nightlyNgn * units - discount, extras });
    }
    return map;
  }
  const catalog = rooms.find((room) => room.id === r.roomId)?.priceFrom ?? 0;
  const total = r.quotedTotalNgn ?? catalog * nights.length * units;
  for (const night of nights) map.set(night, { room: total / nights.length, extras: 0 });
  return map;
}

const round = (n: number) => Math.round(n);

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 10) / 10;
}
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

export function buildHotelReport(input: {
  from: string;
  to: string;
  reservations: ReservationRecord[];
  payments: PaymentRecord[];
  blocks: RoomBlock[];
  inventory: Record<string, number>;
  now?: number;
}): HotelReport {
  const days = eachDay(input.from, input.to);
  const daySet = new Set(days);
  const now = input.now ?? Date.now();
  const roomIds = rooms.map((r) => r.id);
  const totalInventory = roomIds.reduce((sum, id) => sum + (input.inventory[id] ?? 0), 0);

  const blockedByDay = new Map<string, number>();
  const blockedByRoom = new Map<string, number>();
  for (const block of input.blocks) {
    for (const day of stayNights({ checkIn: block.checkIn, checkOut: block.checkOut } as ReservationRecord)) {
      if (!daySet.has(day)) continue;
      blockedByDay.set(day, (blockedByDay.get(day) ?? 0) + 1);
      blockedByRoom.set(block.roomId, (blockedByRoom.get(block.roomId) ?? 0) + 1);
    }
  }

  const occupiedByDay = new Map<string, number>();
  const guestsByDay = new Map<string, number>();
  const byRoom = new Map<string, { roomNights: number; revenue: number }>();
  let roomRevenue = 0;
  let extrasRevenue = 0;
  let roomNightsSold = 0;
  let guestNights = 0;
  const guestsInRange = new Set<string>();

  for (const r of input.reservations) {
    if (r.itemType !== "room" || !r.roomId || !holdsInventory(r, now)) continue;
    const revenue = nightlyRevenue(r);
    const units = r.units ?? 1;
    for (const day of stayNights(r)) {
      if (!daySet.has(day)) continue;
      const night = revenue.get(day) ?? { room: 0, extras: 0 };
      roomRevenue += night.room;
      extrasRevenue += night.extras;
      roomNightsSold += units;
      guestNights += r.guests;
      guestsInRange.add(r.id);
      occupiedByDay.set(day, (occupiedByDay.get(day) ?? 0) + units);
      guestsByDay.set(day, (guestsByDay.get(day) ?? 0) + r.guests);
      const line = byRoom.get(r.roomId) ?? { roomNights: 0, revenue: 0 };
      line.roomNights += units;
      line.revenue += night.room + night.extras;
      byRoom.set(r.roomId, line);
    }
  }

  const roomNightsAvailable = Math.max(
    0,
    totalInventory * days.length - [...blockedByDay.values()].reduce((a, b) => a + b, 0),
  );

  const inRange = (iso?: string) => Boolean(iso && daySet.has(iso.slice(0, 10)));
  const created = input.reservations.filter((r) => r.itemType === "room" && inRange(r.createdAt));
  const cancelled = created.filter((r) => r.status === "cancelled").length;
  const leadDays = created
    .filter((r) => r.checkIn)
    .map((r) => Math.max(0, (Date.parse(`${r.checkIn}T00:00:00Z`) - Date.parse(r.createdAt)) / DAY));

  const paymentGroups = new Map<string, { amountNgn: number; count: number }>();
  for (const p of input.payments) {
    if (p.status !== "success" || !inRange(p.createdAt)) continue;
    const method = p.amountKobo < 0 ? "refund" : (p.paymentMethod ?? p.paymentChannel ?? "paystack");
    const group = paymentGroups.get(method) ?? { amountNgn: 0, count: 0 };
    group.amountNgn += p.amountKobo / 100;
    group.count += 1;
    paymentGroups.set(method, group);
  }

  return {
    from: input.from,
    to: input.to,
    days: days.length,
    keyMetrics: {
      totalRevenueNgn: round(roomRevenue + extrasRevenue),
      roomRevenueNgn: round(roomRevenue),
      extrasRevenueNgn: round(extrasRevenue),
      adrNgn: roomNightsSold ? round(roomRevenue / roomNightsSold) : 0,
      revparNgn: roomNightsAvailable ? round(roomRevenue / roomNightsAvailable) : 0,
    },
    occupancy: {
      occupancyPct: pct(roomNightsSold, roomNightsAvailable),
      roomNightsSold,
      roomNightsAvailable,
      guestNights,
      guests: input.reservations
        .filter((r) => guestsInRange.has(r.id))
        .reduce((sum, r) => sum + r.guests, 0),
    },
    bookingsCreated: {
      count: created.length,
      online: created.filter((r) => bookingChannelOf(r) === "online").length,
      desk: created.filter((r) => bookingChannelOf(r) === "desk").length,
      cancelled,
      cancellationPct: pct(cancelled, created.length),
      medianLeadDays: median(leadDays),
    },
    byRoomType: roomIds.map((roomId) => {
      const line = byRoom.get(roomId) ?? { roomNights: 0, revenue: 0 };
      const available = (input.inventory[roomId] ?? 0) * days.length - (blockedByRoom.get(roomId) ?? 0);
      return {
        roomId,
        roomNights: line.roomNights,
        revenueNgn: round(line.revenue),
        occupancyPct: pct(line.roomNights, available),
      };
    }),
    paymentsByMethod: [...paymentGroups.entries()]
      .map(([method, g]) => ({ method, amountNgn: round(g.amountNgn), count: g.count }))
      .sort((a, b) => b.amountNgn - a.amountNgn),
    daily: days.map((date) => ({
      date,
      occupiedRooms: occupiedByDay.get(date) ?? 0,
      blockedRooms: blockedByDay.get(date) ?? 0,
      availableRooms: totalInventory - (blockedByDay.get(date) ?? 0),
      guests: guestsByDay.get(date) ?? 0,
    })),
  };
}

/** CSV for spreadsheets: a summary block then one row per day. */
export function reportToCsv(report: HotelReport): string {
  const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines: (string | number)[][] = [
    ["Relief Hotels report", `${report.from} to ${report.to}`],
    ["Total revenue (NGN)", report.keyMetrics.totalRevenueNgn],
    ["Room revenue (NGN)", report.keyMetrics.roomRevenueNgn],
    ["Extras revenue (NGN)", report.keyMetrics.extrasRevenueNgn],
    ["ADR (NGN)", report.keyMetrics.adrNgn],
    ["RevPAR (NGN)", report.keyMetrics.revparNgn],
    ["Occupancy %", report.occupancy.occupancyPct],
    ["Room nights sold", report.occupancy.roomNightsSold],
    ["Room nights available", report.occupancy.roomNightsAvailable],
    ["Guest nights", report.occupancy.guestNights],
    ["Bookings created", report.bookingsCreated.count],
    ["Cancellation %", report.bookingsCreated.cancellationPct],
    [],
    ["Date", "Occupied rooms", "Available rooms", "Blocked rooms", "Guests"],
    ...report.daily.map((d) => [d.date, d.occupiedRooms, d.availableRooms, d.blockedRooms, d.guests]),
  ];
  return lines.map((row) => row.map(esc).join(",")).join("\n") + "\n";
}
