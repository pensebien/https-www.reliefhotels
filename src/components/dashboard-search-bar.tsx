"use client";

import type { SearchScope } from "@/lib/dashboard-search";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

const SEARCH_SCOPES: SearchScope[] = ["both", "reservations", "payments"];

export function DashboardSearchBar({
  query,
  scope,
  onQueryChange,
  onScopeChange,
}: {
  query: string;
  scope: SearchScope;
  onQueryChange: (value: string) => void;
  onScopeChange: (scope: SearchScope) => void;
}) {
  const t = useTranslations("demo");

  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 w-full rounded-lg border border-border bg-card py-2 pl-10 pr-10 text-sm text-foreground"
          aria-label={t("searchPlaceholder")}
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-foreground"
            aria-label={t("searchClear")}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {SEARCH_SCOPES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onScopeChange(option)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              scope === option
                ? "bg-teal text-gray-950"
                : "border border-border bg-card text-muted hover:border-teal",
            )}
          >
            {t(`searchScope.${option}`)}
          </button>
        ))}
      </div>

      {query.trim() ? (
        <p className="mt-3 text-xs text-muted">
          {t("searchActiveHint", {
            query: query.trim(),
            scope: t(`searchScope.${scope}`),
          })}
        </p>
      ) : null}
    </div>
  );
}
