import type { RoomBlock } from "@/lib/db/inventory-store";
import type { EventInquiry } from "@/lib/inquiry-store";
import {
  addDays,
  formatYmd,
  parseYmd,
  startOfDay,
} from "@/lib/reservation-dates";
import {
  buildInventoryUnits,
  INVENTORY_BY_ROOM_ID,
  resolveReservationRoomId,
  type InventoryUnit,
} from "@/lib/inventory-units";

export type CalendarReservation = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  guests: number;
  roomId?: string;
  stayPreference: string;
  status: "pending" | "confirmed" | "cancelled";
  paymentReference?: string;
  itemType?: "room" | "tour" | "inquiry";
  source: string;
  createdAt: string;
  emailSent?: boolean;
  staffNotes?: string;
};

export type CalendarBookingKind = "stay" | "event" | "tour" | "block";

export type CalendarBooking = {
  id: string;
  kind: CalendarBookingKind;
  unitId: string;
  roomId: string;
  guestName: string;
  email: string;
  phone?: string;
  checkIn: string;
  checkOut: string;
  status: "pending" | "confirmed" | "cancelled" | "inquiry" | "blocked";
  guests: number;
  label: string;
  paymentReference?: string;
  source: string;
  createdAt: string;
  raw: CalendarReservation | EventInquiry | RoomBlock;
};

export type CalendarDay = {
  ymd: string;
  label: string;
  isToday: boolean;
};

export type CalendarCell = {
  unitId: string;
  ymd: string;
  booking: CalendarBooking | null;
  status: "free" | "occupied" | "pending" | "cancelled" | "inquiry" | "blocked";
};

export type CalendarRow = {
  unit: InventoryUnit;
  cells: CalendarCell[];
  unitLabel: string;
};

export function startOfWeek(date: Date, weekStartsOn = 1): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function buildWeekDays(anchor: Date, weekStartsOn = 1): CalendarDay[] {
  const start = startOfWeek(anchor, weekStartsOn);
  const today = formatYmd(new Date());

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const ymd = formatYmd(date);
    return {
      ymd,
      label: date.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
      }),
      isToday: ymd === today,
    };
  });
}

function stayOverlapsDay(checkIn: string, checkOut: string, ymd: string): boolean {
  const day = parseYmd(ymd);
  const start = parseYmd(checkIn);
  const end = parseYmd(checkOut);
  return day >= start && day < end;
}

function bookingStatusToCell(
  status: CalendarBooking["status"],
): CalendarCell["status"] {
  if (status === "confirmed") return "occupied";
  if (status === "pending") return "pending";
  if (status === "cancelled") return "cancelled";
  if (status === "blocked") return "blocked";
  return "inquiry";
}

/**
 * Room blocks (maintenance/housekeeping holds — `src/lib/db/inventory-store.ts`)
 * already reduce bookable inventory in `countOccupiedUnits`/`getRoomAvailability`;
 * this just makes them visible on the calendar grid, which previously showed
 * a blocked room as plain "free."
 */
export function roomBlockToBookings(
  block: RoomBlock,
): Omit<CalendarBooking, "unitId">[] {
  return [
    {
      id: block.id,
      kind: "block",
      roomId: block.roomId,
      guestName: block.reason ?? "Blocked",
      email: "",
      checkIn: block.checkIn,
      checkOut: block.checkOut,
      status: "blocked",
      guests: 0,
      label: block.reason ?? "Blocked",
      source: "block",
      createdAt: block.createdAt,
      raw: block,
    },
  ];
}

export function reservationToBookings(
  reservation: CalendarReservation,
): Omit<CalendarBooking, "unitId">[] {
  if (reservation.status === "cancelled") return [];
  if (!reservation.checkIn || !reservation.checkOut) return [];

  const roomId = resolveReservationRoomId(reservation);
  if (!roomId && reservation.itemType === "tour") {
    return [
      {
        id: reservation.id,
        kind: "tour",
        roomId: "tour",
        guestName: `${reservation.firstName} ${reservation.lastName}`,
        email: reservation.email,
        phone: reservation.phone,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        status: reservation.status,
        guests: reservation.guests,
        label: reservation.stayPreference,
        paymentReference: reservation.paymentReference,
        source: reservation.source,
        createdAt: reservation.createdAt,
        raw: reservation,
      },
    ];
  }

  if (!roomId) return [];

  return [
    {
      id: reservation.id,
      kind: "stay",
      roomId,
      guestName: `${reservation.firstName} ${reservation.lastName}`,
      email: reservation.email,
      phone: reservation.phone,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      status: reservation.status,
      guests: reservation.guests,
      label: reservation.stayPreference,
      paymentReference: reservation.paymentReference,
      source: reservation.source,
      createdAt: reservation.createdAt,
      raw: reservation,
    },
  ];
}

export function eventInquiryToBookings(
  inquiry: EventInquiry,
  spaceIds: string[],
): Omit<CalendarBooking, "unitId">[] {
  const eventDate = inquiry.eventDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return [];

  let hash = 0;
  for (const ch of inquiry.id) hash = (hash + ch.charCodeAt(0)) % spaceIds.length;
  const roomId = spaceIds[hash] ?? spaceIds[0] ?? "grand-ballroom";

  return [
    {
      id: inquiry.id,
      kind: "event",
      roomId,
      guestName: `${inquiry.firstName} ${inquiry.lastName}`,
      email: inquiry.email,
      phone: inquiry.phone,
      checkIn: eventDate,
      checkOut: formatYmd(addDays(parseYmd(eventDate), 1)),
      status: "inquiry",
      guests: Number.parseInt(inquiry.guestCount, 10) || 0,
      label: inquiry.eventType,
      source: "inquiry",
      createdAt: inquiry.createdAt,
      raw: inquiry,
    },
  ];
}

/** Greedy unit assignment: first free unit for overlapping stays. */
export function assignBookingsToUnits(
  bookings: Omit<CalendarBooking, "unitId">[],
  units: InventoryUnit[],
): CalendarBooking[] {
  const assigned: CalendarBooking[] = [];
  const byRoom = new Map<string, InventoryUnit[]>();

  for (const unit of units) {
    const list = byRoom.get(unit.roomId) ?? [];
    list.push(unit);
    byRoom.set(unit.roomId, list);
  }

  const sorted = [...bookings].sort((a, b) =>
    a.checkIn.localeCompare(b.checkIn),
  );

  for (const booking of sorted) {
    if (booking.kind === "tour") {
      assigned.push({ ...booking, unitId: "tour-unassigned" });
      continue;
    }

    const candidates = byRoom.get(booking.roomId) ?? [];
    let placed = false;

    for (const unit of candidates) {
      const conflict = assigned.some(
        (existing) =>
          existing.unitId === unit.id &&
          rangesOverlap(
            existing.checkIn,
            existing.checkOut,
            booking.checkIn,
            booking.checkOut,
          ),
      );
      if (!conflict) {
        assigned.push({ ...booking, unitId: unit.id });
        placed = true;
        break;
      }
    }

    if (!placed && candidates[0]) {
      assigned.push({ ...booking, unitId: candidates[0].id });
    } else if (!placed) {
      assigned.push({ ...booking, unitId: `${booking.roomId}-overflow` });
    }
  }

  return assigned;
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const a0 = parseYmd(aStart);
  const a1 = parseYmd(aEnd);
  const b0 = parseYmd(bStart);
  const b1 = parseYmd(bEnd);
  return a0 < b1 && b0 < a1;
}

export function buildInventoryCalendar(input: {
  reservations: CalendarReservation[];
  eventInquiries: EventInquiry[];
  roomBlocks?: RoomBlock[];
  weekAnchor: Date;
  unitLabels: Record<string, string>;
}): { days: CalendarDay[]; rows: CalendarRow[]; bookings: CalendarBooking[] } {
  const units = buildInventoryUnits();
  const spaceIds = units.filter((u) => u.kind === "event").map((u) => u.roomId);
  const days = buildWeekDays(input.weekAnchor);

  const unassigned = [
    ...input.reservations.flatMap(reservationToBookings),
    ...input.eventInquiries.flatMap((e) =>
      eventInquiryToBookings(e, spaceIds),
    ),
    ...(input.roomBlocks ?? []).flatMap(roomBlockToBookings),
  ];

  const bookings = assignBookingsToUnits(unassigned, units);

  const rows: CalendarRow[] = units.map((unit) => {
    const unitBookings = bookings.filter((b) => b.unitId === unit.id);
    const baseLabel = input.unitLabels[unit.labelKey] ?? unit.roomId;
    const unitLabel =
      unit.kind === "room" && (INVENTORY_BY_ROOM_ID[unit.roomId] ?? 1) > 1
        ? `${baseLabel} #${unit.unitIndex}`
        : baseLabel;

    const cells: CalendarCell[] = days.map((day) => {
      const booking = unitBookings.find((b) =>
        stayOverlapsDay(b.checkIn, b.checkOut, day.ymd),
      );
      if (!booking) {
        return { unitId: unit.id, ymd: day.ymd, booking: null, status: "free" };
      }
      return {
        unitId: unit.id,
        ymd: day.ymd,
        booking,
        status: bookingStatusToCell(booking.status),
      };
    });

    return { unit, cells, unitLabel };
  });

  return { days, rows, bookings };
}

export function summarizeWeekOccupancy(rows: CalendarRow[]) {
  let free = 0;
  let occupied = 0;
  let pending = 0;
  let blocked = 0;

  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.status === "free") free += 1;
      else if (cell.status === "occupied") occupied += 1;
      else if (cell.status === "pending") pending += 1;
      else if (cell.status === "blocked") blocked += 1;
    }
  }

  return { free, occupied, pending, blocked, total: free + occupied + pending + blocked };
}
