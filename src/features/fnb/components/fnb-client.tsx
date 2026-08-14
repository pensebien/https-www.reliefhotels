"use client";

import { StaffReservationPagination } from "@/components/staff-reservation-pagination";
import { StaffReservationSearch } from "@/components/staff-reservation-search";
import { FnbCatalogBrowser } from "@/features/fnb/components/fnb-catalog-browser";
import { FnbFolioList } from "@/features/fnb/components/fnb-folio-list";
import { FnbKeyForm } from "@/features/fnb/components/fnb-key-form";
import { FnbReservationPicker } from "@/features/fnb/components/fnb-reservation-picker";
import { useFnbReservations } from "@/features/fnb/hooks/use-fnb-reservations";
import { useFolio } from "@/features/fnb/hooks/use-folio";
import { guestFullName } from "@/features/fnb/lib/helpers";
import type { FnbReservation } from "@/features/fnb/types";
import {
  filterStaffReservationsByQuery,
  paginateStaffReservations,
} from "@/lib/staff-reservation-filter";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";

export function FnbClient() {
  const t = useTranslations("fnb");
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("key");

  const [key, setKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<FnbReservation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const resolved =
      keyFromUrl ??
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem(SESSION_STORAGE_KEY)
        : null) ??
      DEFAULT_KEY;
    // Reading sessionStorage requires the client; this can only run post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKey(resolved);
  }, [keyFromUrl]);

  const {
    loading: loadingReservations,
    error: reservationsError,
    notDeployed: reservationsNotDeployed,
    loadedOnce,
    activeReservations,
    refresh: refreshReservations,
  } = useFnbReservations(key);

  const {
    charges,
    taxSettings,
    loading: loadingFolio,
    mutating,
    error: folioError,
    addCharge,
    setStatus,
  } = useFolio(selected?.id ?? null, key);

  const filteredReservations = useMemo(
    () => filterStaffReservationsByQuery(activeReservations, searchQuery),
    [activeReservations, searchQuery],
  );

  const { items: pagedReservations, totalPages, page: safePage } = useMemo(
    () => paginateStaffReservations(filteredReservations, page),
    [filteredReservations, page],
  );

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page]);

  const hasData = loadedOnce && !reservationsError;

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setPage(1);
  }

  function handleKeySubmit(nextKey: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextKey);
    }
    setSelected(null);
    setSearchQuery("");
    setPage(1);
    setKey(nextKey);
  }

  const searchHint = searchQuery.trim()
    ? t("searchResultHint", {
        shown: pagedReservations.length,
        total: filteredReservations.length,
        query: searchQuery.trim(),
      })
    : t("searchResultHintAll", {
        shown: pagedReservations.length,
        total: activeReservations.length,
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
          <button
            type="button"
            onClick={refreshReservations}
            disabled={loadingReservations}
            className="inline-flex items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingReservations ? "animate-spin" : ""}`}
              aria-hidden
            />
            {t("refresh")}
          </button>
        ) : null}
      </div>

      {key !== null && (
        <FnbKeyForm
          key={key}
          initialKey={key}
          loading={loadingReservations}
          onSubmit={handleKeySubmit}
          placeholder={t("keyPlaceholder")}
          submitLabel={t("unlock")}
        />
      )}

      {reservationsError && (
        <p className="mb-6 text-sm text-red-600">
          {reservationsNotDeployed ? t("notDeployed") : reservationsError}
        </p>
      )}

      {hasData && !selected && (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            {t("reservationsTitle")}
          </h2>
          <StaffReservationSearch
            query={searchQuery}
            onQueryChange={handleSearchChange}
            placeholder={t("searchPlaceholder")}
            clearLabel={t("searchClear")}
            resultHint={
              activeReservations.length > 0 || searchQuery.trim()
                ? searchHint
                : undefined
            }
          />
          <FnbReservationPicker
            reservations={pagedReservations}
            selectedId={null}
            onSelect={setSelected}
            emptyTitle={
              searchQuery.trim()
                ? t("searchEmpty", { query: searchQuery.trim() })
                : undefined
            }
            emptyHint={
              searchQuery.trim() ? t("searchEmptyHint") : undefined
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

      {hasData && selected && key && (
        <div>
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-sm text-muted">{t("guestLabel")}</p>
              <p className="font-medium">{guestFullName(selected)}</p>
              <p className="text-sm text-muted">{selected.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:border-teal"
            >
              {t("changeSelection")}
            </button>
          </div>

          {folioError && <p className="mb-4 text-sm text-red-600">{folioError}</p>}

          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            {t("folioTitle")}
          </h2>
          {loadingFolio ? (
            <p className="mb-6 text-sm text-muted">{t("loadingFolio")}</p>
          ) : (
            <div className="mb-6">
              <FnbFolioList
                charges={charges}
                disabled={mutating}
                onSetStatus={(id, status) => setStatus(id, status)}
                taxSettings={taxSettings}
              />
            </div>
          )}

          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            {t("catalogTitle")}
          </h2>
          <FnbCatalogBrowser
            disabled={mutating}
            onAdd={(sku, qty) => addCharge(sku, qty)}
          />
        </div>
      )}
    </div>
  );
}
