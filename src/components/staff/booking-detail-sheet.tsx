"use client";

import type { CalendarBooking } from "@/lib/inventory-calendar";
import { cn, formatNaira } from "@/lib/utils";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

export function BookingDetailSheet({
  booking,
  paymentAmountKobo,
  onClose,
}: {
  booking: CalendarBooking | null;
  paymentAmountKobo?: number;
  onClose: () => void;
}) {
  const t = useTranslations("demo");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!booking) return;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [booking, onClose]);

  if (!booking) return null;

  const isEvent = booking.kind === "event";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 p-0 motion-safe:animate-in motion-safe:fade-in sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-detail-title"
        className="flex h-full w-full max-w-md flex-col border-border bg-card shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {t(`calendar.kind.${booking.kind}`)}
            </p>
            <h2 id="booking-detail-title" className="text-lg font-semibold">
              {booking.guestName}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-border hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            aria-label={t("calendar.closeDetail")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
          <DetailRow label={t("calendar.detailStatus")} value={booking.status} />
          <DetailRow label={t("calendar.detailUnit")} value={booking.label} />
          <DetailRow
            label={t("stayDates")}
            value={`${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)}`}
          />
          <DetailRow label={t("calendar.detailEmail")} value={booking.email} />
          {booking.phone ? (
            <DetailRow label={t("calendar.detailPhone")} value={booking.phone} />
          ) : null}
          <DetailRow
            label={t("calendar.detailGuests")}
            value={String(booking.guests || "—")}
          />
          {booking.paymentReference ? (
            <DetailRow
              label={t("paymentRef")}
              value={booking.paymentReference}
              mono
            />
          ) : null}
          {paymentAmountKobo ? (
            <DetailRow
              label={t("calendar.detailDeposit")}
              value={formatNaira(paymentAmountKobo / 100)}
            />
          ) : null}
          {isEvent && "message" in booking.raw ? (
            <DetailRow label={t("calendar.detailNotes")} value={booking.raw.message} />
          ) : null}
          {"stayPreference" in booking.raw ? (
            <DetailRow
              label={t("calendar.detailPreference")}
              value={booking.raw.stayPreference}
            />
          ) : null}
          <DetailRow
            label={t("reservationId")}
            value={booking.id}
            mono
          />
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-0.5 font-medium", mono && "font-mono text-xs")}>
        {value}
      </p>
    </div>
  );
}

function formatDate(ymd: string) {
  try {
    return new Date(ymd + "T12:00:00").toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return ymd;
  }
}
