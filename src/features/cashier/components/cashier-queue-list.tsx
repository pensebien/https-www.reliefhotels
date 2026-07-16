"use client";

import {
  formatCashierDate,
  guestFullName,
} from "@/features/cashier/lib/helpers";
import type { CashierReservation } from "@/features/cashier/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function CashierQueueList({
  reservations,
  selectedId,
  onSelect,
}: {
  reservations: CashierReservation[];
  selectedId: string | null;
  onSelect: (reservation: CashierReservation) => void;
}) {
  const t = useTranslations("cashier");

  if (reservations.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-medium">{t("queueEmpty")}</p>
        <p className="mt-1 text-sm text-muted">{t("queueEmptyHint")}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {reservations.map((reservation) => {
        const selected = reservation.id === selectedId;
        return (
          <li key={reservation.id}>
            <button
              type="button"
              onClick={() => onSelect(reservation)}
              aria-pressed={selected}
              className={cn(
                "w-full rounded-xl border p-4 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
                selected
                  ? "border-teal bg-teal/10"
                  : "border-border bg-card hover:border-teal/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{guestFullName(reservation)}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    reservation.status === "pending" &&
                      "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                    reservation.status === "confirmed" &&
                      "bg-teal/20 text-teal-dark",
                  )}
                >
                  {reservation.status}
                </span>
              </div>
              <p className="mt-1 text-muted">{reservation.email}</p>
              {reservation.checkIn ? (
                <p className="mt-2 text-xs text-muted">
                  {formatCashierDate(reservation.checkIn)}
                  {reservation.checkOut
                    ? ` → ${formatCashierDate(reservation.checkOut)}`
                    : ""}
                </p>
              ) : null}
              <p className="mt-1 truncate text-xs text-muted">
                {reservation.stayPreference}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
