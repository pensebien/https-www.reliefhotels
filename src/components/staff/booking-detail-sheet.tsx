"use client";

import { StaffReservationActions } from "@/components/staff/staff-reservation-actions";
import type { CalendarBooking } from "@/lib/inventory-calendar";
import { toMailtoHref } from "@/lib/contact-links";
import { cn, formatNaira } from "@/lib/utils";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";
import { PhoneContactLink } from "./phone-contact-link";

export function BookingDetailSheet({
  booking,
  paymentAmountKobo,
  onClose,
  dashboardKey,
  onUpdated,
}: {
  booking: CalendarBooking | null;
  paymentAmountKobo?: number;
  onClose: () => void;
  dashboardKey?: string;
  onUpdated?: () => void;
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
  const canManageStay =
    Boolean(dashboardKey) &&
    booking.kind === "stay" &&
    (booking.status === "pending" || booking.status === "confirmed");

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
          <DetailRow label={t("calendar.detailEmail")}>
            <a
              href={toMailtoHref(booking.email)}
              className="font-medium text-teal underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              aria-label={t("calendar.contactEmailAria", { email: booking.email })}
            >
              {booking.email}
            </a>
          </DetailRow>
          {booking.phone ? (
            <DetailRow label={t("calendar.detailPhone")}>
              <PhoneContactLink
                phone={booking.phone}
                ariaLabel={t("calendar.contactPhoneAria", { phone: booking.phone })}
              />
            </DetailRow>
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
          <DetailRow label={t("reservationId")} value={booking.id} mono />

          {canManageStay && dashboardKey ? (
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {t("calendar.staffActionsTitle")}
              </p>
              {booking.status === "pending" ? (
                <p className="mt-1 text-xs text-muted">
                  {t("calendar.confirmPendingHint")}
                </p>
              ) : null}
              <StaffReservationActions
                reservationId={booking.id}
                dashboardKey={dashboardKey}
                source={booking.source}
                showConfirm={booking.status === "pending"}
                staffNotes={
                  "staffNotes" in booking.raw
                    ? booking.raw.staffNotes
                    : undefined
                }
                onUpdated={() => {
                  onUpdated?.();
                  onClose();
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      {children ? (
        <div className="mt-0.5">{children}</div>
      ) : (
        <p className={cn("mt-0.5 font-medium", mono && "font-mono text-xs")}>
          {value}
        </p>
      )}
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
