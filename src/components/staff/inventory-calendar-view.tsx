"use client";

import type { EventInquiry } from "@/lib/inquiry-store";
import {
  buildInventoryCalendar,
  summarizeWeekOccupancy,
  type CalendarBooking,
  type CalendarCell,
  type CalendarReservation,
  type CalendarRow,
} from "@/lib/inventory-calendar";
import { addDays, formatYmd, parseYmd } from "@/lib/reservation-dates";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { BookingDetailSheet } from "./booking-detail-sheet";
import {
  CategoryIcon,
  categoryFromUnit,
  type OccupancyCategory,
} from "./occupancy-category-icons";
import {
  StaffCreateReservationDialog,
  type MoniepointPublicConfig,
  type StaffCreateReservationSeed,
  type StaffRoomOption,
} from "./staff-create-reservation-dialog";

type PaymentLookup = {
  reference?: string;
  amountKobo?: number;
  reservationId?: string;
};

type OccupancyStatus = "free" | "occupied" | "pending";

const CATEGORY_ORDER: OccupancyCategory[] = [
  "guestRoom",
  "executive",
  "suites",
  "penthouse",
  "eventsMeetings",
];

const ROWS_PER_PAGE = 8;

export const InventoryCalendarView = memo(function InventoryCalendarView({
  reservations,
  eventInquiries,
  paymentsByReservation,
  unitLabels,
  dashboardKey,
  roomOptions = [],
  moniepointConfig,
  onActivityChange,
}: {
  reservations: CalendarReservation[];
  eventInquiries: EventInquiry[];
  paymentsByReservation: Map<string, PaymentLookup[]>;
  unitLabels: Record<string, string>;
  dashboardKey?: string;
  roomOptions?: StaffRoomOption[];
  moniepointConfig?: MoniepointPublicConfig;
  onActivityChange?: () => void;
}) {
  const t = useTranslations("demo");
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<Set<OccupancyStatus>>(
    () => new Set(),
  );
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSeed, setCreateSeed] = useState<StaffCreateReservationSeed | null>(
    null,
  );

  const canCreateBookings = Boolean(dashboardKey && roomOptions.length > 0);

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

  const categoryRows = useMemo(() => {
    if (categoryFilter === "all") return calendar.rows;
    return calendar.rows.filter((row) => row.unit.category === categoryFilter);
  }, [calendar.rows, categoryFilter]);

  const summary = useMemo(
    () => summarizeWeekOccupancy(categoryRows),
    [categoryRows],
  );

  const filteredRows = useMemo(() => {
    if (statusFilter.size === 0) return categoryRows;
    return categoryRows.filter((row) =>
      row.cells.some((cell) => statusFilter.has(cell.status as OccupancyStatus)),
    );
  }, [categoryRows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, weekAnchor, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, page]);

  const pageFrom = filteredRows.length === 0 ? 0 : (page - 1) * ROWS_PER_PAGE + 1;
  const pageTo = Math.min(page * ROWS_PER_PAGE, filteredRows.length);

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

  const toggleStatus = useCallback((status: OccupancyStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  function openCreateForCell(row: CalendarRow, cell: CalendarCell) {
    if (!canCreateBookings) return;
    if (row.unit.kind !== "room") return;
    if (cell.status !== "free") return;
    const checkIn = cell.ymd;
    const checkOut = formatYmd(addDays(parseYmd(checkIn), 1));
    setCreateSeed({
      roomId: row.unit.roomId,
      checkIn,
      checkOut,
      status: "confirmed",
      paymentMethod: "cash",
    });
    setCreateOpen(true);
  }

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
            className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors duration-200 hover:border-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
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
            className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors duration-200 hover:border-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            aria-label={t("calendar.nextWeek")}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setWeekAnchor(new Date())}
            className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors duration-200 hover:border-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            {t("calendar.today")}
          </button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-3 text-xs"
        role="group"
        aria-label={t("calendar.legendFilterHint")}
      >
        <LegendChip
          color="free"
          label={t("calendar.legendFree")}
          count={summary.free}
          pressed={statusFilter.has("free")}
          onClick={() => toggleStatus("free")}
        />
        <LegendChip
          color="occupied"
          label={t("calendar.legendOccupied")}
          count={summary.occupied}
          pressed={statusFilter.has("occupied")}
          onClick={() => toggleStatus("occupied")}
        />
        <LegendChip
          color="pending"
          label={t("calendar.legendPending")}
          count={summary.pending}
          pressed={statusFilter.has("pending")}
          onClick={() => toggleStatus("pending")}
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
            category={cat}
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
                className="sticky left-0 z-10 min-w-[160px] bg-card/95 px-3 py-2 text-left font-medium"
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
            {paginatedRows.map((row) => {
              const category = categoryFromUnit(row.unit);
              return (
                <tr key={row.unit.id} className="border-b border-border/60">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-normal text-foreground"
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/80"
                        aria-hidden
                      >
                        <CategoryIcon category={category} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 leading-snug">{row.unitLabel}</span>
                    </span>
                  </th>
                  {row.cells.map((cell) => {
                    const isStart =
                      cell.booking && cell.booking.checkIn === cell.ymd;
                    const showLabel = isStart && cell.booking;
                    const statusActive =
                      statusFilter.size === 0 ||
                      statusFilter.has(cell.status as OccupancyStatus);
                    const bookableFree =
                      canCreateBookings &&
                      cell.status === "free" &&
                      row.unit.kind === "room";

                    return (
                      <td key={cell.ymd} className="p-0.5">
                        {cell.booking ? (
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(cell.booking)}
                            className={cn(
                              "flex h-10 w-full cursor-pointer items-center rounded-md px-1 text-left text-[10px] font-medium leading-tight transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal",
                              cell.status === "occupied" &&
                                "bg-teal/25 text-teal-dark",
                              cell.status === "pending" &&
                                "bg-amber-500/20 text-amber-900 dark:text-amber-100",
                              cell.status === "inquiry" &&
                                "bg-violet-500/20 text-violet-900 dark:text-violet-100",
                              cell.status === "cancelled" &&
                                "bg-border text-muted",
                              !statusActive && "opacity-25",
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
                        ) : bookableFree ? (
                          <button
                            type="button"
                            onClick={() => openCreateForCell(row, cell)}
                            className={cn(
                              "flex h-10 w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-emerald-500/30 bg-emerald-500/5 text-emerald-700/70 transition-colors duration-200 hover:border-teal hover:bg-teal/10 hover:text-teal-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal dark:text-emerald-300/50",
                              !statusActive && "opacity-25",
                            )}
                            aria-label={t("calendar.bookFreeCell", {
                              unit: row.unitLabel,
                              date: cell.ymd,
                            })}
                          >
                            <span aria-hidden>+</span>
                          </button>
                        ) : (
                          <div
                            className={cn(
                              "flex h-10 items-center justify-center rounded-md bg-emerald-500/5 text-emerald-700/40 dark:text-emerald-300/30",
                              !statusActive && "opacity-25",
                            )}
                            aria-label={t("calendar.cellFree", {
                              date: cell.ymd,
                            })}
                          >
                            <span aria-hidden>·</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredRows.length > ROWS_PER_PAGE ? (
        <OccupancyPagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          labels={{
            label: t("calendar.pagination.label"),
            showing: t("calendar.pagination.showing", {
              from: pageFrom,
              to: pageTo,
              total: filteredRows.length,
            }),
            prev: t("calendar.pagination.prev"),
            next: t("calendar.pagination.next"),
            page: (p: number) =>
              t("calendar.pagination.page", { page: p, total: totalPages }),
          }}
        />
      ) : null}

      <p className="text-xs text-muted">{t("calendar.hint")}</p>

      <BookingDetailSheet
        booking={selectedBooking}
        paymentAmountKobo={selectedPayment?.amountKobo}
        onClose={() => setSelectedBooking(null)}
        dashboardKey={dashboardKey}
        onUpdated={() => onActivityChange?.()}
      />

      {dashboardKey ? (
        <StaffCreateReservationDialog
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setCreateSeed(null);
          }}
          dashboardKey={dashboardKey}
          roomOptions={roomOptions}
          moniepointConfig={moniepointConfig}
          seed={createSeed}
          onCreated={() => onActivityChange?.()}
        />
      ) : null}
    </section>
  );
});

function OccupancyPagination({
  page,
  totalPages,
  onPageChange,
  labels,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  labels: {
    label: string;
    showing: string;
    prev: string;
    next: string;
    page: (p: number) => string;
  };
}) {
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-4 py-3"
      aria-label={labels.label}
    >
      <p className="text-xs text-muted">{labels.showing}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={labels.prev}
          className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-card p-2 text-muted transition-colors duration-200 hover:border-teal hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        {pageNumbers.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-label={labels.page(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "min-w-[2.25rem] cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium tabular-nums transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
              p === page
                ? "bg-teal text-gray-950"
                : "border border-border bg-card text-muted hover:border-teal hover:text-foreground",
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={labels.next}
          className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-card p-2 text-muted transition-colors duration-200 hover:border-teal hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}

function LegendChip({
  color,
  label,
  count,
  pressed,
  onClick,
}: {
  color: OccupancyStatus;
  label: string;
  count: number;
  pressed: boolean;
  onClick: () => void;
}) {
  const swatch =
    color === "free"
      ? "bg-emerald-500/15 border-emerald-500/30"
      : color === "occupied"
        ? "bg-teal/25 border-teal/40"
        : "bg-amber-500/20 border-amber-500/40";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 transition-shadow duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        swatch,
        pressed && "ring-2 ring-teal ring-offset-2 ring-offset-background",
      )}
    >
      {label}
      <span className="font-semibold tabular-nums">{count}</span>
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  category,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  category?: OccupancyCategory;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        active
          ? "bg-teal text-gray-950"
          : "border border-border bg-card text-muted hover:border-teal",
      )}
    >
      {category ? (
        <CategoryIcon
          category={category}
          className={cn("h-3.5 w-3.5", active && "text-gray-950")}
        />
      ) : null}
      {label}
    </button>
  );
}
