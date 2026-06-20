"use client";

import type { EventInquiry } from "@/lib/inquiry-store";
import {
  buildInventoryCalendar,
  summarizeWeekOccupancy,
  type CalendarBooking,
  type CalendarReservation,
} from "@/lib/inventory-calendar";
import { addDays, parseYmd } from "@/lib/reservation-dates";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, memo } from "react";
import { BookingDetailSheet } from "./booking-detail-sheet";

type PaymentLookup = {
  reference?: string;
  amountKobo?: number;
  reservationId?: string;
};

const CATEGORY_ORDER = [
  "guestRoom",
  "executive",
  "suites",
  "penthouse",
  "eventsMeetings",
] as const;

export const InventoryCalendarView = memo(function InventoryCalendarView({
  reservations,
  eventInquiries,
  paymentsByReservation,
  unitLabels,
}: {
  reservations: CalendarReservation[];
  eventInquiries: EventInquiry[];
  paymentsByReservation: Map<string, PaymentLookup[]>;
  unitLabels: Record<string, string>;
}) {
  const t = useTranslations("demo");
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const calendar = useMemo(
    () =>
      buildInventoryCalendar({
        reservations,
        eventInquiries,
        weekAnchor,
        unitLabels,
      }),
    [eventInquiries, reservations, unitLabels, weekAnchor],
  );

  const summary = useMemo(
    () => summarizeWeekOccupancy(calendar.rows),
    [calendar.rows],
  );

  const filteredRows = useMemo(() => {
    if (categoryFilter === "all") return calendar.rows;
    return calendar.rows.filter((row) => row.unit.category === categoryFilter);
  }, [calendar.rows, categoryFilter]);

  const weekRangeLabel = useMemo(() => {
    const start = calendar.days[0]?.ymd;
    const end = calendar.days[6]?.ymd;
    if (!start || !end) return "";
    const fmt = (ymd: string) =>
      parseYmd(ymd).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [calendar.days]);

  const shiftWeek = useCallback((delta: number) => {
    setWeekAnchor((prev) => addDays(prev, delta * 7));
  }, []);

  const selectedPayment = selectedBooking
    ? paymentsByReservation
        .get(selectedBooking.id)
        ?.find((p) => p.reference === selectedBooking.paymentReference)
    : undefined;

  return (
    <section aria-labelledby="inventory-calendar-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="inventory-calendar-heading" className="text-lg font-semibold">
            {t("calendar.title")}
          </h2>
          <p className="text-sm text-muted">{t("calendar.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:border-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            aria-label={t("calendar.prevWeek")}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-medium">
            {weekRangeLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:border-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            aria-label={t("calendar.nextWeek")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setWeekAnchor(new Date())}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:border-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            {t("calendar.today")}
          </button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-3 text-xs"
        role="status"
        aria-live="polite"
      >
        <LegendChip color="free" label={t("calendar.legendFree")} count={summary.free} />
        <LegendChip
          color="occupied"
          label={t("calendar.legendOccupied")}
          count={summary.occupied}
        />
        <LegendChip
          color="pending"
          label={t("calendar.legendPending")}
          count={summary.pending}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={categoryFilter === "all"}
          onClick={() => setCategoryFilter("all")}
          label={t("filters.all")}
        />
        {CATEGORY_ORDER.map((cat) => (
          <FilterChip
            key={cat}
            active={categoryFilter === cat}
            onClick={() => setCategoryFilter(cat)}
            label={t(`calendar.categories.${cat}`)}
          />
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card/50">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <caption className="sr-only">{t("calendar.tableCaption")}</caption>
          <thead>
            <tr className="border-b border-border bg-card/80">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[140px] bg-card/95 px-3 py-2 text-left font-medium"
              >
                {t("calendar.unitColumn")}
              </th>
              {calendar.days.map((day) => (
                <th
                  key={day.ymd}
                  scope="col"
                  className={cn(
                    "min-w-[72px] px-1 py-2 text-center font-medium",
                    day.isToday && "bg-teal/10 text-teal-dark",
                  )}
                >
                  <span className="block">{day.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.unit.id} className="border-b border-border/60">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-normal text-foreground"
                >
                  {row.unitLabel}
                </th>
                {row.cells.map((cell) => {
                  const isStart =
                    cell.booking && cell.booking.checkIn === cell.ymd;
                  const showLabel = isStart && cell.booking;

                  return (
                    <td key={cell.ymd} className="p-0.5">
                      {cell.booking ? (
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(cell.booking)}
                          className={cn(
                            "flex h-10 w-full cursor-pointer items-center rounded-md px-1 text-left text-[10px] font-medium leading-tight transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal",
                            cell.status === "occupied" &&
                              "bg-teal/25 text-teal-dark",
                            cell.status === "pending" &&
                              "bg-amber-500/20 text-amber-900 dark:text-amber-100",
                            cell.status === "inquiry" &&
                              "bg-violet-500/20 text-violet-900 dark:text-violet-100",
                            cell.status === "cancelled" && "bg-border text-muted",
                          )}
                          aria-label={t("calendar.openBooking", {
                            guest: cell.booking.guestName,
                            date: cell.ymd,
                          })}
                        >
                          {showLabel ? (
                            <span className="line-clamp-2">
                              {cell.booking.guestName}
                            </span>
                          ) : (
                            <span className="sr-only">
                              {cell.booking.guestName}
                            </span>
                          )}
                        </button>
                      ) : (
                        <div
                          className="flex h-10 items-center justify-center rounded-md bg-emerald-500/5 text-emerald-700/40 dark:text-emerald-300/30"
                          aria-label={t("calendar.cellFree", { date: cell.ymd })}
                        >
                          <span aria-hidden>·</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">{t("calendar.hint")}</p>

      <BookingDetailSheet
        booking={selectedBooking}
        paymentAmountKobo={selectedPayment?.amountKobo}
        onClose={() => setSelectedBooking(null)}
      />
    </section>
  );
});

function LegendChip({
  color,
  label,
  count,
}: {
  color: "free" | "occupied" | "pending";
  label: string;
  count: number;
}) {
  const swatch =
    color === "free"
      ? "bg-emerald-500/15 border-emerald-500/30"
      : color === "occupied"
        ? "bg-teal/25 border-teal/40"
        : "bg-amber-500/20 border-amber-500/40";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1",
        swatch,
      )}
    >
      {label}
      <span className="font-semibold tabular-nums">{count}</span>
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        active
          ? "bg-teal text-gray-950"
          : "border border-border bg-card text-muted hover:border-teal",
      )}
    >
      {label}
    </button>
  );
}
