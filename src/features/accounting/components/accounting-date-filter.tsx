"use client";

import type { LedgerDateRange } from "@/lib/accounting/ledger";
import { useTranslations } from "next-intl";

export function AccountingDateFilter({
  dateRange,
  onChange,
}: {
  dateRange: LedgerDateRange;
  onChange: (range: LedgerDateRange) => void;
}) {
  const t = useTranslations("accounting");

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <label
          className="mb-1 block text-xs font-medium text-muted"
          htmlFor="accounting-date-from"
        >
          {t("dateFrom")}
        </label>
        <input
          id="accounting-date-from"
          type="date"
          value={dateRange.from ?? ""}
          onChange={(e) =>
            onChange({ ...dateRange, from: e.target.value || undefined })
          }
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        />
      </div>
      <div>
        <label
          className="mb-1 block text-xs font-medium text-muted"
          htmlFor="accounting-date-to"
        >
          {t("dateTo")}
        </label>
        <input
          id="accounting-date-to"
          type="date"
          value={dateRange.to ?? ""}
          onChange={(e) =>
            onChange({ ...dateRange, to: e.target.value || undefined })
          }
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
        />
      </div>
      {(dateRange.from || dateRange.to) && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="h-10 rounded-lg border border-border px-3 text-sm hover:border-teal"
        >
          {t("clearDates")}
        </button>
      )}
    </div>
  );
}
