const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function parseYmd(value: string): Date {
  if (!YMD.test(value)) {
    throw new Error(`Invalid date: ${value}`);
  }
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

export type DateRangePreset =
  | "upcoming"
  | "today"
  | "week"
  | "month"
  | "all"
  | "custom";

export type DateRange = {
  from: string;
  to: string;
};

/** Stay overlaps [from, to] inclusive (YYYY-MM-DD). */
export function stayOverlapsRange(
  checkIn: string | undefined,
  checkOut: string | undefined,
  range: DateRange,
): boolean {
  if (!checkIn && !checkOut) return false;

  const rangeStart = parseYmd(range.from);
  const rangeEnd = parseYmd(range.to);
  const stayStart = parseYmd(checkIn ?? checkOut!);
  const stayEnd = parseYmd(checkOut ?? checkIn!);

  return stayStart <= rangeEnd && stayEnd >= rangeStart;
}

export function createdAtInRange(createdAt: string, range: DateRange): boolean {
  const created = startOfDay(new Date(createdAt));
  const rangeStart = parseYmd(range.from);
  const rangeEnd = parseYmd(range.to);
  return created >= rangeStart && created <= rangeEnd;
}

export function resolveDateRange(
  preset: DateRangePreset,
  custom?: Partial<DateRange>,
  now: Date = new Date(),
): DateRange | null {
  const today = startOfDay(now);

  switch (preset) {
    case "all":
      return null;
    case "today":
      return { from: formatYmd(today), to: formatYmd(today) };
    case "week":
      return { from: formatYmd(today), to: formatYmd(addDays(today, 6)) };
    case "month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: formatYmd(from), to: formatYmd(to) };
    }
    case "upcoming":
      return { from: formatYmd(today), to: formatYmd(addDays(today, 365)) };
    case "custom": {
      if (custom?.from && custom?.to && YMD.test(custom.from) && YMD.test(custom.to)) {
        return { from: custom.from, to: custom.to };
      }
      return { from: formatYmd(today), to: formatYmd(addDays(today, 30)) };
    }
  }
}

export function reservationInDateRange(
  reservation: {
    checkIn?: string;
    checkOut?: string;
    createdAt: string;
    itemType?: string;
  },
  range: DateRange | null,
): boolean {
  if (!range) return true;

  if (reservation.checkIn || reservation.checkOut) {
    return stayOverlapsRange(
      reservation.checkIn,
      reservation.checkOut,
      range,
    );
  }

  return createdAtInRange(reservation.createdAt, range);
}
