"use client";

import { formatFnbDate, guestFullName } from "@/features/fnb/lib/helpers";
import type { FnbReservation } from "@/features/fnb/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function FnbReservationPicker({
  reservations,
  selectedId,
  onSelect,
}: {
  reservations: FnbReservation[];
  selectedId: string | null;
  onSelect: (reservation: FnbReservation) => void;
}) {
  const t = useTranslations("fnb");

  if (reservations.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-medium">{t("reservationsEmpty")}</p>
        <p className="mt-1 text-sm text-muted">{t("reservationsEmptyHint")}</p>
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
                  {formatFnbDate(reservation.checkIn)}
                  {reservation.checkOut
                    ? ` → ${formatFnbDate(reservation.checkOut)}`
                    : ""}
                </p>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
