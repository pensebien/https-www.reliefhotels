"use client";

import { Search, X } from "lucide-react";

/** Simple name / email / id search for staff reservation pickers (F&B, cashier). */
export function StaffReservationSearch({
  query,
  onQueryChange,
  placeholder,
  clearLabel,
  resultHint,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  clearLabel: string;
  resultHint?: string;
}) {
  return (
    <div className="mb-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-border bg-card py-2 pl-10 pr-10 text-sm text-foreground"
          aria-label={placeholder}
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-foreground"
            aria-label={clearLabel}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {resultHint ? (
        <p className="mt-2 text-xs text-muted">{resultHint}</p>
      ) : null}
    </div>
  );
}
