"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

export function DashboardFiltersPanel({
  open,
  onOpenChange,
  activeCount,
  summary,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount: number;
  summary?: string | null;
  children: React.ReactNode;
}) {
  const t = useTranslations("demo");

  return (
    <div className="mb-8 rounded-xl border border-border bg-card/40">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4 text-teal" aria-hidden />
          {t("filtersPanelTitle")}
          {activeCount > 0 ? (
            <span className="rounded-full bg-teal/15 px-2 py-0.5 text-xs font-medium text-teal-dark">
              {activeCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {!open && summary ? (
        <p className="border-t border-border px-4 pb-3 pt-0 text-xs text-muted">
          {summary}
        </p>
      ) : null}

      {open ? (
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}
