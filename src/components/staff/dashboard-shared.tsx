"use client";

import {
  BookingCategoryIcon,
  PaymentRowTypeIcon,
  ReservationRowTypeIcon,
  RowTypeBadge,
} from "@/components/staff/occupancy-category-icons";
import { PhoneContactLink } from "@/components/staff/phone-contact-link";
import {
  resolveBookingCategoryKey,
  type BookingCategoryKey,
} from "@/lib/booking-category";
import { parseYmd } from "@/lib/reservation-dates";
import { toMailtoHref } from "@/lib/contact-links";
import { cn, formatNaira } from "@/lib/utils";
import { useTranslations } from "next-intl";

export type DashboardReservationRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  guests: number;
  itemType?: "room" | "tour" | "inquiry";
  roomId?: string;
  stayPreference: string;
  status: "pending" | "confirmed" | "cancelled";
  paymentReference?: string;
  staffNotes?: string;
  source: string;
  createdAt: string;
  emailSent: boolean;
};

export type DashboardPaymentRow = {
  id: string;
  reference: string;
  reservationId?: string;
  email: string;
  amountKobo: number;
  status: string;
  itemType?: "room" | "tour";
  itemId?: string;
  itemLabel: string;
  paymentMethod?: "cash" | "moniepoint_terminal" | "moniepoint_transfer" | "paystack";
  source: string;
  createdAt: string;
};

export function formatStayDate(ymd: string) {
  try {
    return parseYmd(ymd).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return ymd;
  }
}

export function formatDashboardDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function StatusBadge({ status }: { status: DashboardReservationRow["status"] }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        status === "confirmed" && "bg-teal/20 text-teal-dark",
        status === "pending" && "bg-amber-500/15 text-amber-800 dark:text-amber-200",
        status === "cancelled" && "bg-border text-muted",
      )}
    >
      {status}
    </span>
  );
}

export function CategoryBadge({
  categoryKey,
  label,
}: {
  categoryKey: BookingCategoryKey;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
        categoryKey === "penthouse" && "bg-violet-500/15 text-violet-200",
        categoryKey === "suite" && "bg-teal/15 text-teal-dark",
        categoryKey === "executive" && "bg-sky-500/15 text-sky-200",
        categoryKey === "room" && "bg-border text-muted",
        categoryKey === "eventsMeetings" && "bg-amber-500/15 text-amber-200",
        categoryKey === "tour" && "bg-emerald-500/15 text-emerald-200",
        categoryKey === "inquiry" && "bg-border text-muted",
      )}
    >
      {label}
    </span>
  );
}

export function DepositChip({
  paid,
  amountNgn,
  reference,
}: {
  paid: boolean;
  amountNgn?: number;
  reference?: string;
}) {
  const t = useTranslations("demo");

  if (paid && amountNgn != null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2.5 py-1 text-xs font-medium text-teal-dark">
        {t("depositPaidChip", { amount: formatNaira(amountNgn) })}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-900 dark:text-amber-100">
      {t("depositMissingChip")}
    </span>
  );
}

export function BookingListCard({
  reservation,
  successPayment,
  compactMeta = false,
}: {
  reservation: DashboardReservationRow;
  successPayment?: DashboardPaymentRow;
  compactMeta?: boolean;
}) {
  const t = useTranslations("demo");
  const categoryKey = resolveBookingCategoryKey({
    itemType: reservation.itemType,
    roomId: reservation.roomId,
    stayPreference: reservation.stayPreference,
  });

  return (
    <article className="rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex gap-3">
        <div className="flex shrink-0 flex-col gap-1.5">
          <RowTypeBadge variant="reservation" label={t("rowTypeReservation")}>
            <ReservationRowTypeIcon />
          </RowTypeBadge>
          <span
            className="flex h-8 w-9 items-center justify-center rounded-lg border border-border/70 bg-background/80"
            aria-hidden
          >
            <BookingCategoryIcon categoryKey={categoryKey} className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">
              {reservation.firstName} {reservation.lastName}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <CategoryBadge
                categoryKey={categoryKey}
                label={t(`categories.${categoryKey}`)}
              />
              <StatusBadge status={reservation.status} />
            </div>
          </div>
          <p className="text-muted">{reservation.email}</p>
          {reservation.phone ? (
            <p className="text-xs text-muted">{reservation.phone}</p>
          ) : null}
          {(reservation.checkIn || reservation.checkOut) && (
            <p className="mt-2 rounded-lg border border-teal/20 bg-teal/5 px-3 py-2 text-xs font-medium text-foreground">
              {t("stayDates")}:{" "}
              {reservation.checkIn ? formatStayDate(reservation.checkIn) : "—"} →{" "}
              {reservation.checkOut ? formatStayDate(reservation.checkOut) : "—"}
              {reservation.nights ? ` · ${reservation.nights} night(s)` : ""}
              {reservation.guests ? ` · ${reservation.guests} guest(s)` : ""}
            </p>
          )}
          <div className="mt-2">
            <DepositChip
              paid={Boolean(successPayment)}
              amountNgn={
                successPayment ? successPayment.amountKobo / 100 : undefined
              }
              reference={successPayment?.reference}
            />
          </div>
          {!compactMeta ? (
            <>
              {!reservation.checkIn &&
                !reservation.checkOut &&
                reservation.itemType === "room" && (
                  <p className="mt-2 text-xs font-medium text-amber-600">
                    {t("missingStayDates")}
                  </p>
                )}
              <p className="mt-1 text-xs text-muted">{reservation.stayPreference}</p>
              <p className="mt-2 font-mono text-[10px] text-muted">
                {t("reservationId")}: {reservation.id}
              </p>
              <p className="mt-2 text-[10px] text-muted">
                {formatDashboardDate(reservation.createdAt)}
                {reservation.emailSent ? " · ✉ sent" : ""}
                {" · "}
                {reservation.source}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function PaymentListCard({
  payment,
  linkedReservation,
}: {
  payment: DashboardPaymentRow;
  linkedReservation?: DashboardReservationRow;
}) {
  const t = useTranslations("demo");
  const categoryKey = resolveBookingCategoryKey({
    itemType: payment.itemType ?? linkedReservation?.itemType,
    itemId: payment.itemId,
    roomId: linkedReservation?.roomId,
    stayPreference: linkedReservation?.stayPreference,
  });

  const statusLabel =
    payment.status === "success"
      ? t("paymentStatus.success")
      : payment.status === "failed" || payment.status === "abandoned"
        ? t("paymentStatus.failed")
        : t("paymentStatus.pending");

  return (
    <article className="rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex gap-3">
        <div className="flex shrink-0 flex-col gap-1.5">
          <RowTypeBadge variant="payment" label={t("rowTypePayment")}>
            <PaymentRowTypeIcon />
          </RowTypeBadge>
          <span
            className="flex h-8 w-9 items-center justify-center rounded-lg border border-border/70 bg-background/80"
            aria-hidden
          >
            <BookingCategoryIcon categoryKey={categoryKey} className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{formatNaira(payment.amountKobo / 100)}</p>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <CategoryBadge
                categoryKey={categoryKey}
                label={t(`categories.${categoryKey}`)}
              />
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  payment.status === "success"
                    ? "bg-teal/20 text-teal-dark"
                    : payment.status === "failed" || payment.status === "abandoned"
                      ? "bg-red-500/15 text-red-800 dark:text-red-200"
                      : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                )}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <p className="text-muted">{payment.itemLabel}</p>
          {payment.paymentMethod ? (
            <p className="mt-1 text-xs text-muted">
              {t(`createReservation.paymentMethods.${payment.paymentMethod}`)}
            </p>
          ) : null}
          <p className="mt-1 font-mono text-xs text-muted">{payment.reference}</p>
          {linkedReservation?.checkIn ? (
            <p className="mt-1 text-xs text-muted">
              {t("stayDates")}: {formatStayDate(linkedReservation.checkIn)} →{" "}
              {formatStayDate(linkedReservation.checkOut ?? "—")}
            </p>
          ) : null}
          <p className="mt-2 text-[10px] text-muted">
            {formatDashboardDate(payment.createdAt)} · {payment.source}
          </p>
        </div>
      </div>
    </article>
  );
}

export function DashboardTabBar<T extends string>({
  label,
  tabs,
  active,
  onChange,
}: {
  label: string;
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-wrap gap-2"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
            active === tab.id
              ? "bg-teal text-gray-950"
              : "border border-border bg-card text-muted hover:border-teal",
          )}
        >
          {tab.label}
          {tab.count != null ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                active === tab.id ? "bg-gray-950/10" : "bg-border",
              )}
            >
              {tab.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function ContactActions({
  email,
  phone,
}: {
  email: string;
  phone?: string;
}) {
  const t = useTranslations("demo");

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a
        href={toMailtoHref(email)}
        className="inline-flex cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors duration-200 hover:border-teal"
      >
        {t("inbox.contactEmail")}
      </a>
      {phone ? (
        <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs">
          <PhoneContactLink
            phone={phone}
            ariaLabel={t("calendar.contactPhoneAria", { phone })}
            className="text-xs"
          />
        </span>
      ) : null}
    </div>
  );
}
