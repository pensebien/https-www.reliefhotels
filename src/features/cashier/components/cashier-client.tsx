"use client";

import { StaffReservationPagination } from "@/components/staff-reservation-pagination";
import { StaffReservationSearch } from "@/components/staff-reservation-search";
import { CashierFnbPanel } from "@/features/cashier/components/cashier-fnb-panel";
import { CashierKeyForm } from "@/features/cashier/components/cashier-key-form";
import { CashierQueueList } from "@/features/cashier/components/cashier-queue-list";
import { CashierSettlePanel } from "@/features/cashier/components/cashier-settle-panel";
import { useCashierQueue } from "@/features/cashier/hooks/use-cashier-queue";
import type { CashierReservation } from "@/features/cashier/types";
import {
  filterStaffReservationsByQuery,
  paginateStaffReservations,
} from "@/lib/staff-reservation-filter";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { CalendarDays, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";

type CashierMode = "settle" | "fnb";

export function CashierClient() {
  const t = useTranslations("cashier");
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("key");

  const [key, setKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<CashierReservation | null>(null);
  const [mode, setMode] = useState<CashierMode>("settle");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const resolved =
      keyFromUrl ??
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem(SESSION_STORAGE_KEY)
        : null) ??
      DEFAULT_KEY;
    setKey(resolved);
  }, [keyFromUrl]);

  const {
    loading,
    error,
    notDeployed,
    loadedOnce,
    unsettledReservations,
    activeReservations,
    moniepointConfig,
    paystackTerminalConfig,
    refresh,
  } = useCashierQueue(key);

  const sourceList =
    mode === "settle" ? unsettledReservations : activeReservations;

  const filteredReservations = useMemo(
    () => filterStaffReservationsByQuery(sourceList, searchQuery),
    [sourceList, searchQuery],
  );

  const { items: pagedReservations, totalPages, page: safePage } = useMemo(
    () => paginateStaffReservations(filteredReservations, page),
    [filteredReservations, page],
  );

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page]);

  const hasData = loadedOnce && !error;

  function handleKeySubmit(nextKey: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextKey);
    }
    setSelected(null);
    setSearchQuery("");
    setPage(1);
    setKey(nextKey);
  }

  function handleModeChange(next: CashierMode) {
    setMode(next);
    setSelected(null);
    setSearchQuery("");
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setPage(1);
  }

  const searchHint = searchQuery.trim()
    ? t("searchResultHint", {
        shown: pagedReservations.length,
        total: filteredReservations.length,
        query: searchQuery.trim(),
      })
    : t("searchResultHintAll", {
        shown: pagedReservations.length,
        total: sourceList.length,
      });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-muted">{t("subtitle")}</p>
        </div>
        {hasData ? (
          <div className="flex flex-wrap items-center gap-2 self-start">
            <Link
              href={{
                pathname: "/staff/calendar",
                query: key ? { key } : undefined,
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              {t("calendarBookLink")}
            </Link>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
              {t("refresh")}
            </button>
          </div>
        ) : null}
      </div>

      {key !== null && (
        <CashierKeyForm
          key={key}
          initialKey={key}
          loading={loading}
          onSubmit={handleKeySubmit}
          placeholder={t("keyPlaceholder")}
          submitLabel={t("unlock")}
        />
      )}

      {error && (
        <p className="mb-6 text-sm text-red-600">
          {notDeployed ? t("notDeployed") : error}
        </p>
      )}

      {hasData && !selected && (
        <>
          <div
            className="mb-5 flex flex-wrap gap-2"
            role="tablist"
            aria-label={t("modeLabel")}
          >
            {(
              [
                ["settle", t("modeSettle")],
                ["fnb", t("modeFnb")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => handleModeChange(value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  mode === value
                    ? "bg-teal text-gray-950"
                    : "border border-border bg-card text-muted hover:border-teal",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            {mode === "settle" ? t("queueTitle") : t("fnbQueueTitle")}
          </h2>
          <StaffReservationSearch
            query={searchQuery}
            onQueryChange={handleSearchChange}
            placeholder={t("searchPlaceholder")}
            clearLabel={t("searchClear")}
            resultHint={
              sourceList.length > 0 || searchQuery.trim() ? searchHint : undefined
            }
          />
          <CashierQueueList
            reservations={pagedReservations}
            selectedId={null}
            onSelect={setSelected}
            emptyTitle={
              searchQuery.trim()
                ? t("searchEmpty", { query: searchQuery.trim() })
                : mode === "fnb"
                  ? t("fnbQueueEmpty")
                  : undefined
            }
            emptyHint={
              searchQuery.trim()
                ? t("searchEmptyHint")
                : mode === "fnb"
                  ? t("fnbQueueEmptyHint")
                  : undefined
            }
          />
          <StaffReservationPagination
            page={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
            previousLabel={t("paginationPrevious")}
            nextLabel={t("paginationNext")}
            pageLabel={t("paginationPage", {
              page: safePage,
              total: totalPages,
            })}
          />
        </>
      )}

      {hasData && selected && key && mode === "settle" && (
        <CashierSettlePanel
          reservation={selected}
          cashierKey={key}
          moniepointConfig={moniepointConfig}
          paystackTerminalConfig={paystackTerminalConfig}
          onBack={() => setSelected(null)}
          onSettled={() => {
            setSelected(null);
            refresh();
          }}
        />
      )}

      {hasData && selected && key && mode === "fnb" && (
        <CashierFnbPanel
          reservation={selected}
          cashierKey={key}
          onBack={() => setSelected(null)}
        />
      )}
    </div>
  );
}
