"use client";

import {
  formatYmd,
  isValidYmd,
  resolveDateRange,
  type DateRangePreset,
} from "@/lib/reservation-dates";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

const DATE_PRESETS: DateRangePreset[] = [
  "upcoming",
  "today",
  "week",
  "month",
  "all",
  "custom",
];

export function DashboardDateFilter({
  datePreset,
  onPresetChange,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  onApply,
  dateError,
}: {
  datePreset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
  dateError: string | null;
}) {
  const t = useTranslations("demo");

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
        {t("dateFilterTitle")}
      </p>

      <div className="flex flex-wrap gap-2">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onPresetChange(preset)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              datePreset === preset
                ? "bg-teal text-gray-950"
                : "border border-border bg-card text-muted hover:border-teal",
            )}
          >
            {t(`dateFilters.${preset}`)}
          </button>
        ))}
      </div>

      {datePreset === "custom" ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DateField
              label={t("dateFrom")}
              hint={t("dateFormatHint")}
              value={fromValue}
              onChange={onFromChange}
            />
            <DateField
              label={t("dateTo")}
              hint={t("dateFormatHint")}
              value={toValue}
              onChange={onToChange}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onApply}
              className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-gray-950"
            >
              {t("applyDateFilter")}
            </button>
            {dateError ? (
              <p className="text-xs text-red-600" role="alert">
                {dateError}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function DateField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="date"
          value={isValidYmd(value) ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
          aria-label={`${label} picker`}
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder={hint}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 flex-1 rounded-lg border border-border bg-card px-3 font-mono text-sm text-foreground"
          aria-label={`${label} text`}
        />
      </div>
    </div>
  );
}

export function getPaginationMeta(
  page: number,
  totalItems: number,
  pageSize: number,
) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  return { totalPages, safePage, start, end, needsPagination: totalItems > pageSize };
}

export function DashboardPagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  placement = "footer",
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  placement?: "header" | "footer";
}) {
  const t = useTranslations("demo");
  const { totalPages, safePage, start, end, needsPagination } = getPaginationMeta(
    page,
    totalItems,
    pageSize,
  );

  if (!needsPagination) return null;

  const isHeader = placement === "header";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        isHeader
          ? "mb-4 rounded-lg border border-border bg-card/80 px-3 py-2"
          : "mt-4 border-t border-border pt-4",
      )}
    >
      <p className="text-xs text-muted">
        {t("paginationShowing", { start, end, total: totalItems })}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          aria-label={t("paginationPrev")}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {isHeader ? t("paginationPrevShort") : t("paginationPrev")}
        </button>
        <span className="min-w-[5rem] text-center text-xs font-medium text-foreground">
          {t("paginationPage", { page: safePage, totalPages })}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          aria-label={t("paginationNext")}
        >
          {isHeader ? t("paginationNextShort") : t("paginationNext")}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function fieldsForPreset(preset: DateRangePreset): {
  from: string;
  to: string;
} {
  const range = resolveDateRange(preset);
  if (!range) return { from: "", to: "" };
  return { from: range.from, to: range.to };
}

export function todayYmd() {
  return formatYmd(new Date());
}
