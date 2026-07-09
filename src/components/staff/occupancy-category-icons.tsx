import type { BookingCategoryKey } from "@/lib/booking-category";
import type { InventoryUnit } from "@/lib/inventory-units";
import { cn } from "@/lib/utils";
import { CalendarCheck, CreditCard, HelpCircle, MapPin } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

export type OccupancyCategory =
  | "guestRoom"
  | "executive"
  | "suites"
  | "penthouse"
  | "eventsMeetings";

type IconProps = {
  className?: string;
};

/** Material-outlined style: 24×24, 1.5 stroke, round caps. */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function GuestRoomIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden
    >
      <path
        {...stroke}
        d="M3 10v8a1 1 0 001 1h1M20 10v8a1 1 0 01-1 1h-1M3 14h18M5 10V7a2 2 0 012-2h10a2 2 0 012 2v3"
      />
      <path {...stroke} d="M8 14h3v4H8zM13 14h3v4h-3z" />
      <path {...stroke} d="M9 7V5M15 7V5" />
    </svg>
  );
}

export function ExecutiveRoomIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden
    >
      <path
        {...stroke}
        d="M4 10v9h16v-9M4 14h16M7 10V6.5A1.5 1.5 0 018.5 5h7A1.5 1.5 0 0117 6.5V10"
      />
      <path {...stroke} d="M9 14v5M15 14v5" />
      <circle {...stroke} cx="12" cy="8" r="1" />
    </svg>
  );
}

export function SuiteIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden
    >
      <path
        {...stroke}
        d="M3 12v7a1 1 0 001 1h6v-8H4a1 1 0 00-1 1zM14 12v8h6a1 1 0 001-1v-7a1 1 0 00-1-1h-6z"
      />
      <path {...stroke} d="M10 12V8.5A2.5 2.5 0 0112.5 6h2A2.5 2.5 0 0117 8.5V12" />
      <path {...stroke} d="M12 6V4M14 6V4" />
      <path {...stroke} d="M7 15h2M15 15h2" />
    </svg>
  );
}

export function PenthouseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden
    >
      <path
        {...stroke}
        d="M5 20V9l7-5 7 5v11M5 20h14"
      />
      <path {...stroke} d="M9 20v-5h6v5" />
      <path {...stroke} d="M10 9h4M12 7v2" />
      <path
        {...stroke}
        d="M12 3l.9 1.8 2 .3-1.45 1.4.35 2L12 7.6 9.2 8.5l.35-2L8.1 5.1l2-.3L12 3z"
      />
    </svg>
  );
}

export function PavilionIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden
    >
      <path {...stroke} d="M4 18h16M6 18V11M10 18V11M14 18V11M18 18V11" />
      <path
        {...stroke}
        d="M3 11l9-6 9 6"
      />
      <path {...stroke} d="M8 11c0-1.5 1.5-2.5 4-2.5s4 1 4 2.5" />
      <circle {...stroke} cx="12" cy="8" r="1" />
    </svg>
  );
}

const CATEGORY_ICON: Record<
  OccupancyCategory,
  ComponentType<IconProps>
> = {
  guestRoom: GuestRoomIcon,
  executive: ExecutiveRoomIcon,
  suites: SuiteIcon,
  penthouse: PenthouseIcon,
  eventsMeetings: PavilionIcon,
};

const CATEGORY_ACCENT: Record<OccupancyCategory, string> = {
  guestRoom: "text-sky-700 dark:text-sky-300",
  executive: "text-indigo-700 dark:text-indigo-300",
  suites: "text-teal-dark dark:text-teal",
  penthouse: "text-amber-800 dark:text-amber-200",
  eventsMeetings: "text-violet-700 dark:text-violet-300",
};

export function CategoryIcon({
  category,
  className,
}: {
  category: OccupancyCategory;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[category];
  return (
    <Icon
      className={cn(CATEGORY_ACCENT[category], className)}
    />
  );
}

export function categoryFromUnit(unit: InventoryUnit): OccupancyCategory {
  return unit.category;
}

export function bookingCategoryToOccupancy(
  key: BookingCategoryKey,
): OccupancyCategory | null {
  const map: Partial<Record<BookingCategoryKey, OccupancyCategory>> = {
    room: "guestRoom",
    executive: "executive",
    suite: "suites",
    penthouse: "penthouse",
    eventsMeetings: "eventsMeetings",
  };
  return map[key] ?? null;
}

export function BookingCategoryIcon({
  categoryKey,
  className,
}: {
  categoryKey: BookingCategoryKey;
  className?: string;
}) {
  const occupancy = bookingCategoryToOccupancy(categoryKey);
  if (occupancy) {
    return <CategoryIcon category={occupancy} className={className} />;
  }
  if (categoryKey === "tour") {
    return (
      <MapPin className={cn("h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300", className)} aria-hidden />
    );
  }
  return (
    <HelpCircle className={cn("h-4 w-4 shrink-0 text-muted", className)} aria-hidden />
  );
}

export function ReservationRowTypeIcon({ className }: IconProps) {
  return (
    <CalendarCheck
      className={cn("h-4 w-4 shrink-0 text-teal-dark dark:text-teal", className)}
      aria-hidden
    />
  );
}

export function PaymentRowTypeIcon({ className }: IconProps) {
  return (
    <CreditCard
      className={cn("h-4 w-4 shrink-0 text-teal-dark dark:text-teal", className)}
      aria-hidden
    />
  );
}

export function RowTypeBadge({
  children,
  variant,
  label,
}: {
  children: ReactNode;
  variant: "reservation" | "payment";
  label: string;
}) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
        variant === "reservation"
          ? "border-teal/30 bg-teal/10"
          : "border-sky-500/30 bg-sky-500/10",
      )}
      title={label}
      aria-label={label}
    >
      {children}
    </span>
  );
}
