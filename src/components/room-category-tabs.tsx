"use client";

import { roomsCatalogTabs, type RoomsCatalogTab } from "@/content/site";
import {
  bookingSearchToQueryString,
  defaultCheckInDate,
  defaultCheckOutDate,
  parseBookingSearchParams,
  toDateString,
} from "@/lib/booking-search";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

export function resolveActiveTab(categoryParam: string | null): RoomsCatalogTab {
  if (
    categoryParam &&
    (roomsCatalogTabs as readonly string[]).includes(categoryParam)
  ) {
    return categoryParam as RoomsCatalogTab;
  }
  return "all";
}

export function buildRoomCategoryHref(
  tab: RoomsCatalogTab,
  searchParams: URLSearchParams,
): string {
  const parsed = parseBookingSearchParams(searchParams);
  const sp = new URLSearchParams();

  const query =
    parsed ??
    ({
      checkIn: toDateString(defaultCheckInDate()),
      checkOut: toDateString(defaultCheckOutDate()),
      rooms: 1,
      guests: 1,
    } as const);

  const qs = bookingSearchToQueryString({
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    rooms: query.rooms,
    guests: query.guests,
  });
  for (const [key, value] of new URLSearchParams(qs)) {
    sp.set(key, value);
  }

  if (tab !== "all") sp.set("category", tab);

  return `/rooms?${sp.toString()}`;
}

export function RoomCategoryTabs({
  className,
  embedded = false,
}: {
  className?: string;
  /** When true, sits below .rooms-page-container (no extra card chrome). */
  embedded?: boolean;
}) {
  const t = useTranslations("rooms");
  const searchParams = useSearchParams();
  const activeTab = resolveActiveTab(searchParams.get("category"));

  return (
    <nav
      role="tablist"
      aria-label={t("tabsAria")}
      className={cn(
        embedded
          ? "border-t border-border"
          : "border-b border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-1 px-4 lg:px-16">
        {roomsCatalogTabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Link
              key={tab}
              href={buildRoomCategoryHref(tab, searchParams)}
              role="tab"
              aria-selected={isActive}
              id={`rooms-tab-${tab}`}
              scroll={false}
              className={cn(
                "relative px-4 py-3.5 text-sm font-semibold transition-colors sm:px-6 sm:text-base",
                isActive
                  ? "text-foreground after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-teal sm:after:left-4 sm:after:right-4"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t(`tabs.${tab}`)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
