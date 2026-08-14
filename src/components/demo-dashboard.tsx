"use client";

import { DashboardFiltersPanel } from "@/components/dashboard-filters-panel";
import { InventoryCalendarView } from "@/components/staff/inventory-calendar-view";
import { DashboardInboxView } from "@/components/staff/dashboard-inbox-view";
import { DashboardListsView } from "@/components/staff/dashboard-lists-view";
import type {
  DashboardPaymentRow,
  DashboardReservationRow,
} from "@/components/staff/dashboard-shared";
import { StaffCreateReservationDialog } from "@/components/staff/staff-create-reservation-dialog";
import { rooms } from "@/content/site";
import { eventSpaces } from "@/features/phase-2-product-expansion/content/event-spaces";
import { DashboardSearchBar } from "@/components/dashboard-search-bar";
import {
  DashboardDateFilter,
  DashboardPageSizeSelect,
  fieldsForPreset,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from "@/components/dashboard-date-pagination";
import {
  filterPaymentsBySearch,
  filterReservationsBySearch,
  normalizeSearchQuery,
  type SearchScope,
} from "@/lib/dashboard-search";
import type { RoomBlock } from "@/lib/db/inventory-store";
import { isBookingReservation } from "@/lib/is-booking-reservation";
import { parseYmd } from "@/lib/reservation-dates";
import {
  isValidYmd,
  reservationInDateRange,
  resolveDateRange,
  type DateRangePreset,
} from "@/lib/reservation-dates";
import { cn } from "@/lib/utils";
import { CalendarDays, LayoutList, Plus, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type StorageHealth = {
  mode: "supabase" | "file";
  supabaseConfigured: boolean;
  connected: boolean | null;
  message: string;
};

type EventInquiryRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  guestCount: string;
  message: string;
  createdAt: string;
};

type GuestFeedbackRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: string;
};

type Activity = {
  config: {
    demoMode: boolean;
    paystackConfigured: boolean;
    emailConfigured: boolean;
    appUrl: string;
    storageMode: "supabase" | "file";
    supabaseConfigured: boolean;
    storageHealth: StorageHealth;
    notifyChannel: string;
  };
  moniepoint?: {
    configured: boolean;
    terminalConfigured: boolean;
    demoMode: boolean;
    transferAccount: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    } | null;
  };
  reservations: DashboardReservationRow[];
  payments: DashboardPaymentRow[];
  eventInquiries?: EventInquiryRow[];
  guestFeedback?: GuestFeedbackRow[];
  roomBlocks?: RoomBlock[];
};

type DashboardView = "calendar" | "lists";

const DEFAULT_PAGE_SIZE: PageSizeOption = 4;

const DEFAULT_KEY = "relief-demo-2026";

function formatStayDate(ymd: string) {
  try {
    return parseYmd(ymd).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return ymd;
  }
}

export function DemoDashboard({
  variant = "demo",
}: {
  variant?: "demo" | "portal";
}) {
  const t = useTranslations("demo");
  const tRooms = useTranslations("rooms");
  const tEvents = useTranslations("phase2.events.spaces");
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("key");

  const [key, setKey] = useState(DEFAULT_KEY);
  const [inputKey, setInputKey] = useState(DEFAULT_KEY);
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const initialPreset: DateRangePreset =
    variant === "portal" ? "upcoming" : "all";
  const initialFields = fieldsForPreset(initialPreset);

  const [datePreset, setDatePreset] = useState<DateRangePreset>(initialPreset);
  const [customFrom, setCustomFrom] = useState(initialFields.from);
  const [customTo, setCustomTo] = useState(initialFields.to);
  const [dateError, setDateError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("both");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<DashboardView>(
    variant === "portal" ? "calendar" : "lists",
  );
  const [createReservationOpen, setCreateReservationOpen] = useState(false);

  useEffect(() => {
    const rangeParam = searchParams.get("range") as DateRangePreset | null;
    if (rangeParam) {
      setDatePreset(rangeParam);
      const fields = fieldsForPreset(rangeParam);
      if (fields.from) setCustomFrom(fields.from);
      if (fields.to) setCustomTo(fields.to);
    }
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    if (fromParam) {
      setCustomFrom(fromParam);
      setDatePreset("custom");
    }
    if (toParam) {
      setCustomTo(toParam);
      setDatePreset("custom");
    }
  }, [searchParams]);

  useEffect(() => {
    const saved = sessionStorage.getItem("dashboard-page-size");
    if (!saved) return;
    const parsed = Number(saved);
    if (PAGE_SIZE_OPTIONS.includes(parsed as PageSizeOption)) {
      setPageSize(parsed as PageSizeOption);
    }
  }, []);

  function handlePageSizeChange(size: PageSizeOption) {
    setPageSize(size);
    sessionStorage.setItem("dashboard-page-size", String(size));
  }

  function handlePresetChange(preset: DateRangePreset) {
    setDatePreset(preset);
    setDateError(null);
    if (preset === "custom") {
      const fields = fieldsForPreset("custom");
      setCustomFrom(fields.from);
      setCustomTo(fields.to);
    } else {
      const fields = fieldsForPreset(preset);
      setCustomFrom(fields.from);
      setCustomTo(fields.to);
    }
  }

  function handleApplyDateFilter() {
    if (datePreset === "all") {
      setDateError(null);
      return;
    }
    if (!isValidYmd(customFrom) || !isValidYmd(customTo)) {
      setDateError(t("dateInvalid"));
      return;
    }
    if (parseYmd(customTo) < parseYmd(customFrom)) {
      setDateError(t("dateRangeInvalid"));
      return;
    }
    setDatePreset("custom");
    setDateError(null);
  }

  const load = useCallback(async (dashboardKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/demo/activity?key=${encodeURIComponent(dashboardKey)}`,
      );
      if (res.status === 401) {
        setError(t("unauthorized"));
        setData(null);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? t("serverError"));
        setData(null);
        return;
      }
      const json = (await res.json()) as Activity;
      setData(json);
      sessionStorage.setItem("demo-dashboard-key", dashboardKey);
    } catch {
      setError(t("serverError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const saved =
      keyFromUrl ??
      sessionStorage.getItem("demo-dashboard-key") ??
      DEFAULT_KEY;
    setKey(saved);
    setInputKey(saved);
    load(saved);
  }, [keyFromUrl, load]);

  const paymentsByReservation = useMemo(() => {
    const map = new Map<string, DashboardPaymentRow[]>();
    if (!data) return map;
    for (const payment of data.payments) {
      if (!payment.reservationId) continue;
      const list = map.get(payment.reservationId) ?? [];
      list.push(payment);
      map.set(payment.reservationId, list);
    }
    return map;
  }, [data]);

  const reservationsById = useMemo(() => {
    const map = new Map<string, DashboardReservationRow>();
    if (!data) return map;
    for (const reservation of data.reservations) {
      map.set(reservation.id, reservation);
    }
    return map;
  }, [data]);

  const activeDateRange = useMemo(
    () =>
      resolveDateRange(datePreset, {
        from: customFrom || undefined,
        to: customTo || undefined,
      }),
    [customFrom, customTo, datePreset],
  );

  const normalizedSearch = normalizeSearchQuery(searchQuery);

  const baseReservations = useMemo(() => {
    if (!data) return [];
    return data.reservations
      .filter((r) => isBookingReservation(r.itemType))
      .filter((r) => reservationInDateRange(r, activeDateRange))
      .sort((a, b) => {
      if (a.checkIn && b.checkIn) {
        return a.checkIn.localeCompare(b.checkIn);
      }
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [activeDateRange, data]);

  const filteredReservations = useMemo(() => {
    if (!normalizedSearch) return baseReservations;
    return filterReservationsBySearch(
      baseReservations,
      paymentsByReservation,
      searchQuery,
      searchScope,
    );
  }, [
    baseReservations,
    normalizedSearch,
    paymentsByReservation,
    searchQuery,
    searchScope,
  ]);

  const basePayments = useMemo(() => {
    if (!data) return [];
    return [...data.payments]
      .filter((p) => {
        if (p.reservationId) {
          const reservation = reservationsById.get(p.reservationId);
          if (
            reservation &&
            !reservationInDateRange(reservation, activeDateRange)
          ) {
            return false;
          }
          return true;
        }
        if (!activeDateRange) return true;
        return reservationInDateRange(
          {
            createdAt: p.createdAt,
            itemType: p.itemType,
          },
          activeDateRange,
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [activeDateRange, data, reservationsById]);

  const filteredPayments = useMemo(() => {
    if (!normalizedSearch) {
      return basePayments;
    }

    if (searchScope === "reservations") {
      const visibleReservationIds = new Set(
        filteredReservations.map((r) => r.id),
      );
      return basePayments.filter(
        (p) => p.reservationId && visibleReservationIds.has(p.reservationId),
      );
    }

    return filterPaymentsBySearch(
      basePayments,
      reservationsById,
      searchQuery,
      searchScope,
    );
  }, [
    basePayments,
    filteredReservations,
    normalizedSearch,
    reservationsById,
    searchQuery,
    searchScope,
  ]);

  const storageWarning =
    data?.config.storageHealth.mode === "file" ||
    data?.config.storageHealth.connected === false;

  const defaultDatePreset: DateRangePreset =
    variant === "portal" ? "upcoming" : "all";

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (normalizedSearch) count += 1;
    if (datePreset !== defaultDatePreset) count += 1;
    return count;
  }, [datePreset, defaultDatePreset, normalizedSearch]);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (normalizedSearch) {
      parts.push(t("filterSummarySearch", { query: searchQuery.trim() }));
    }
    if (datePreset !== defaultDatePreset || activeDateRange) {
      if (datePreset === "all") {
        parts.push(t("dateFilters.all"));
      } else if (activeDateRange) {
        parts.push(
          t("filterSummaryDates", {
            from: formatStayDate(activeDateRange.from),
            to: formatStayDate(activeDateRange.to),
          }),
        );
      } else {
        parts.push(t(`dateFilters.${datePreset}`));
      }
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [
    activeDateRange,
    datePreset,
    defaultDatePreset,
    normalizedSearch,
    searchQuery,
    t,
  ]);

  const roomOptions = useMemo(
    () =>
      rooms.map((room) => {
        const path = room.nameKey.replace(/^rooms\./, "");
        return {
          id: room.id,
          label: tRooms(path as "guest.name"),
          priceFrom: room.priceFrom,
        };
      }),
    [tRooms],
  );

  const unitLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const room of rooms) {
      const path = room.nameKey.replace(/^rooms\./, "");
      labels[room.nameKey] = tRooms(path as "guest.name");
    }
    for (const space of eventSpaces) {
      const path = space.nameKey.replace(/^spaces\./, "");
      labels[space.nameKey] = tEvents(path as "ballroom.name");
    }
    return labels;
  }, [tEvents, tRooms]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {variant === "demo" ? (
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-teal">Internal</p>
            <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
            <p className="mt-2 text-muted">{t("subtitle")}</p>
          </div>
        ) : (
          <div>
            <h1 className="font-serif text-2xl font-medium sm:text-3xl">
              {t("portalHeading")}
            </h1>
            <p className="mt-1 text-sm text-muted">{t("portalSubheading")}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {data ? (
            <button
              type="button"
              onClick={() => setCreateReservationOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-teal px-4 py-2 text-sm font-medium text-gray-950 hover:bg-teal-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("createReservation.button")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => load(key)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
      </div>

      <form
        className="mb-6 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setKey(inputKey);
          load(inputKey);
        }}
      >
        <input
          type="password"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          placeholder={t("keyPlaceholder")}
          className="h-10 min-w-[200px] flex-1 rounded-lg border border-border bg-card px-3 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-gray-950"
        >
          {t("unlock")}
        </button>
      </form>

      {error && <p className="mb-6 text-red-600">{error}</p>}

      {data && (
        <>
          {storageWarning && (
            <div
              className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
              role="alert"
            >
              <p className="font-medium">{t("storageWarningTitle")}</p>
              <p className="mt-1 text-xs opacity-90">
                {data.config.storageHealth.message}
              </p>
            </div>
          )}

          <DashboardFiltersPanel
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeCount={activeFilterCount}
            summary={filterSummary}
          >
            <div>
              <p className="mb-2 text-xs font-medium text-muted">{t("searchTitle")}</p>
              <DashboardSearchBar
                query={searchQuery}
                scope={searchScope}
                onQueryChange={setSearchQuery}
                onScopeChange={setSearchScope}
              />
            </div>

            <DashboardDateFilter
              datePreset={datePreset}
              onPresetChange={handlePresetChange}
              fromValue={customFrom}
              toValue={customTo}
              onFromChange={setCustomFrom}
              onToChange={setCustomTo}
              onApply={handleApplyDateFilter}
              dateError={dateError}
            />

            {variant === "demo" ? (
              <div>
                <p className="mb-2 text-xs font-medium text-muted">
                  {t("systemStatusTitle")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatusCard
                    label={t("status.storage")}
                    ok={data.config.storageHealth.connected === true}
                    hint={data.config.storageHealth.message}
                  />
                  <StatusCard
                    label={t("status.paystack")}
                    ok={data.config.paystackConfigured}
                    hint={
                      data.config.demoMode
                        ? t("status.demoPayments")
                        : t("status.live")
                    }
                  />
                  <StatusCard
                    label={t("status.email")}
                    ok={data.config.emailConfigured}
                    hint={
                      data.config.emailConfigured
                        ? t("status.resend")
                        : t("status.console")
                    }
                  />
                  <StatusCard
                    label={t("status.notify")}
                    ok={data.config.notifyChannel !== "console"}
                    hint={data.config.notifyChannel}
                  />
                </div>
              </div>
            ) : null}
          </DashboardFiltersPanel>

          <div
            className="mb-6 flex flex-wrap items-center justify-between gap-3"
            role="tablist"
            aria-label={t("viewModeLabel")}
          >
            <div className="inline-flex rounded-lg border border-border bg-card p-1">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "calendar"}
                onClick={() => setViewMode("calendar")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
                  viewMode === "calendar"
                    ? "bg-teal text-gray-950"
                    : "text-muted hover:text-foreground",
                )}
              >
                <CalendarDays className="h-4 w-4" aria-hidden />
                {t("viewCalendar")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "lists"}
                onClick={() => setViewMode("lists")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
                  viewMode === "lists"
                    ? "bg-teal text-gray-950"
                    : "text-muted hover:text-foreground",
                )}
              >
                <LayoutList className="h-4 w-4" aria-hidden />
                {t("viewLists")}
              </button>
            </div>
            {viewMode === "lists" ? (
              <DashboardPageSizeSelect
                value={pageSize}
                onChange={handlePageSizeChange}
              />
            ) : null}
          </div>

          {viewMode === "calendar" ? (
            <InventoryCalendarView
              reservations={filteredReservations}
              eventInquiries={data.eventInquiries ?? []}
              roomBlocks={data.roomBlocks ?? []}
              paymentsByReservation={paymentsByReservation}
              unitLabels={unitLabels}
              dashboardKey={key}
              roomOptions={roomOptions}
              moniepointConfig={data?.moniepoint}
              onActivityChange={() => load(key)}
            />
          ) : variant === "portal" ? (
            <DashboardListsView
              reservations={filteredReservations}
              payments={filteredPayments}
              guestFeedback={data.guestFeedback ?? []}
              paymentsByReservation={paymentsByReservation}
              reservationsById={reservationsById}
              pageSize={pageSize}
              defaultBookingStatus="pending"
              dashboardKey={key}
              onReservationUpdated={() => load(key)}
            />
          ) : (
            <DashboardInboxView
              reservations={filteredReservations}
              payments={filteredPayments}
              guestFeedback={data.guestFeedback ?? []}
              paymentsByReservation={paymentsByReservation}
              reservationsById={reservationsById}
              pageSize={pageSize}
              dashboardKey={key}
              onReservationUpdated={() => load(key)}
            />
          )}
        </>
      )}

      <StaffCreateReservationDialog
        open={createReservationOpen}
        onClose={() => setCreateReservationOpen(false)}
        dashboardKey={key}
        roomOptions={roomOptions}
        moniepointConfig={data?.moniepoint}
        onCreated={() => load(key)}
      />
    </div>
  );
}

function StatusCard({
  label,
  ok,
  hint,
}: {
  label: string;
  ok: boolean;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 font-semibold ${ok ? "text-teal-dark" : "text-amber-600"}`}>
        {ok ? "✓ Ready" : "○ Action needed"}
      </p>
      <p className="mt-1 line-clamp-2 text-xs text-muted">{hint}</p>
    </div>
  );
}
