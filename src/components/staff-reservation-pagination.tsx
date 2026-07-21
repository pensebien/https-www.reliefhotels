"use client";

import { cn } from "@/lib/utils";

export function StaffReservationPagination({
  page,
  totalPages,
  onPageChange,
  previousLabel,
  nextLabel,
  pageLabel,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
  pageLabel: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={cn(
          "rounded-full border border-border px-3 py-1.5 text-xs hover:border-teal disabled:opacity-40",
        )}
      >
        {previousLabel}
      </button>
      <p className="text-xs text-muted">{pageLabel}</p>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={cn(
          "rounded-full border border-border px-3 py-1.5 text-xs hover:border-teal disabled:opacity-40",
        )}
      >
        {nextLabel}
      </button>
    </div>
  );
}
