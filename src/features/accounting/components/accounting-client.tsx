"use client";

import { AccountingCsvButton } from "@/features/accounting/components/accounting-csv-button";
import { AccountingDateFilter } from "@/features/accounting/components/accounting-date-filter";
import { AccountingKeyForm } from "@/features/accounting/components/accounting-key-form";
import { AccountingSummaryCards } from "@/features/accounting/components/accounting-summary-cards";
import { AccountingTable } from "@/features/accounting/components/accounting-table";
import { useAccountingLedger } from "@/features/accounting/hooks/use-accounting-ledger";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";

export function AccountingClient() {
  const t = useTranslations("accounting");
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("key");

  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    const resolved =
      keyFromUrl ??
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem(SESSION_STORAGE_KEY)
        : null) ??
      DEFAULT_KEY;
    // Deferred to an effect so the resolved key (which depends on
    // browser-only sessionStorage) never differs between the server and
    // client's first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKey(resolved);
  }, [keyFromUrl]);

  const {
    loading,
    error,
    notDeployed,
    loadedOnce,
    rows,
    successfulRows,
    channelSummary,
    dateRange,
    setDateRange,
    refresh,
  } = useAccountingLedger(key);

  const hasData = loadedOnce && !error;

  function handleKeySubmit(nextKey: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextKey);
    }
    setKey(nextKey);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-teal">
            {t("eyebrow")}
          </p>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted">{t("subtitle")}</p>
        </div>
        {hasData ? (
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
            {t("refresh")}
          </button>
        ) : null}
      </div>

      {key !== null && (
        <AccountingKeyForm
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

      {hasData && (
        <>
          <AccountingDateFilter dateRange={dateRange} onChange={setDateRange} />
          <AccountingSummaryCards summary={channelSummary} />

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
              {t("tableTitle")}
            </h2>
            <AccountingCsvButton rows={successfulRows} />
          </div>

          <AccountingTable rows={rows} />
        </>
      )}
    </div>
  );
}
