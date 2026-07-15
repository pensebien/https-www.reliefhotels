"use client";

import { DashboardPagination, getPaginationMeta } from "@/components/dashboard-date-pagination";
import {
  ContactActions,
  DashboardTabBar,
  DepositChip,
  PaymentListCard,
  StatusBadge,
  formatDashboardDate,
  formatStayDate,
  type DashboardPaymentRow,
  type DashboardReservationRow,
} from "@/components/staff/dashboard-shared";
import {
  BookingCategoryIcon,
  ReservationRowTypeIcon,
  RowTypeBadge,
} from "@/components/staff/occupancy-category-icons";
import { resolveBookingCategoryKey } from "@/lib/booking-category";
import { StaffReservationActions } from "@/components/staff/staff-reservation-actions";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

type InboxTab =
  | "needsAction"
  | "confirmed"
  | "cancelled"
  | "messages"
  | "paymentsLedger";

export type DashboardGuestFeedbackRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
  createdAt: string;
};

function hasSuccessfulDeposit(
  reservationId: string,
  paymentsByReservation: Map<string, DashboardPaymentRow[]>,
): DashboardPaymentRow | undefined {
  return paymentsByReservation
    .get(reservationId)
    ?.find((p) => p.status === "success");
}

function InboxCaseCard({
  reservation,
  successPayment,
  showActions,
  dashboardKey,
  onUpdated,
}: {
  reservation: DashboardReservationRow;
  successPayment?: DashboardPaymentRow;
  showActions: boolean;
  dashboardKey: string;
  onUpdated: () => void;
}) {
  const t = useTranslations("demo");
  const categoryKey = resolveBookingCategoryKey({
    itemType: reservation.itemType,
    roomId: reservation.roomId,
    stayPreference: reservation.stayPreference,
  });
  const needsDeposit = showActions && !successPayment;

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-4 text-sm",
        needsDeposit ? "border-amber-500/40 shadow-sm" : "border-border",
      )}
    >
      <div className="flex gap-3">
        <div className="flex shrink-0 flex-col gap-1.5">
          <RowTypeBadge variant="reservation" label={t("rowTypeReservation")}>
            <ReservationRowTypeIcon />
          </RowTypeBadge>
          <span
            className="flex h-8 w-9 items-center justify-center rounded-lg border border-border/70 bg-background/80"
            aria-hidden
          >
            <BookingCategoryIcon
              categoryKey={categoryKey}
              className="h-3.5 w-3.5"
            />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                {reservation.firstName} {reservation.lastName}
              </p>
              <p className="text-xs text-muted">{reservation.stayPreference}</p>
            </div>
            <StatusBadge status={reservation.status} />
          </div>

          {(reservation.checkIn || reservation.checkOut) && (
            <p className="mt-2 text-xs font-medium text-foreground">
              {reservation.checkIn ? formatStayDate(reservation.checkIn) : "—"} →{" "}
              {reservation.checkOut ? formatStayDate(reservation.checkOut) : "—"}
              {reservation.guests ? ` · ${reservation.guests} guest(s)` : ""}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DepositChip
              paid={Boolean(successPayment)}
              amountNgn={
                successPayment ? successPayment.amountKobo / 100 : undefined
              }
            />
            {needsDeposit ? (
              <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                {t("inbox.awaitingDeposit")}
              </span>
            ) : null}
          </div>

          {showActions ? (
            <>
              <ContactActions email={reservation.email} phone={reservation.phone} />
              <StaffReservationActions
                reservationId={reservation.id}
                dashboardKey={dashboardKey}
                source={reservation.source}
                staffNotes={reservation.staffNotes}
                onUpdated={onUpdated}
              />
            </>
          ) : (
            <p className="mt-2 text-[10px] text-muted">
              {formatDashboardDate(reservation.createdAt)} · {reservation.source}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function GuestMessageCard({ message }: { message: DashboardGuestFeedbackRow }) {
  const t = useTranslations("demo");

  return (
    <article className="rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {message.firstName} {message.lastName}
          </p>
          <p className="text-xs text-muted">{t("inbox.messageBadge")}</p>
        </div>
        <p className="text-[10px] text-muted">
          {formatDashboardDate(message.createdAt)}
        </p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
        {message.message}
      </p>
      <ContactActions email={message.email} phone={message.phone} />
    </article>
  );
}

export function DashboardInboxView({
  reservations,
  payments,
  guestFeedback = [],
  paymentsByReservation,
  reservationsById,
  pageSize,
  dashboardKey,
  onReservationUpdated,
}: {
  reservations: DashboardReservationRow[];
  payments: DashboardPaymentRow[];
  guestFeedback?: DashboardGuestFeedbackRow[];
  paymentsByReservation: Map<string, DashboardPaymentRow[]>;
  reservationsById: Map<string, DashboardReservationRow>;
  pageSize: number;
  dashboardKey: string;
  onReservationUpdated: () => void;
}) {
  const t = useTranslations("demo");
  const sectionRef = useRef<HTMLElement>(null);
  const [inboxTab, setInboxTab] = useState<InboxTab>("needsAction");
  const [page, setPage] = useState(1);

  const needsAction = useMemo(() => {
    return reservations
      .filter((r) => r.status === "pending")
      .sort((a, b) => {
        const aPaid = hasSuccessfulDeposit(a.id, paymentsByReservation) ? 1 : 0;
        const bPaid = hasSuccessfulDeposit(b.id, paymentsByReservation) ? 1 : 0;
        if (aPaid !== bPaid) return aPaid - bPaid;
        if (a.checkIn && b.checkIn) return a.checkIn.localeCompare(b.checkIn);
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
  }, [paymentsByReservation, reservations]);

  const confirmed = useMemo(
    () => reservations.filter((r) => r.status === "confirmed"),
    [reservations],
  );

  const cancelled = useMemo(
    () => reservations.filter((r) => r.status === "cancelled"),
    [reservations],
  );

  const messages = useMemo(
    () =>
      [...guestFeedback].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [guestFeedback],
  );

  const tabCounts = useMemo(
    () => ({
      needsAction: needsAction.length,
      confirmed: confirmed.length,
      cancelled: cancelled.length,
      messages: messages.length,
      paymentsLedger: payments.length,
    }),
    [
      cancelled.length,
      confirmed.length,
      messages.length,
      needsAction.length,
      payments.length,
    ],
  );

  const activeListLength = useMemo(() => {
    switch (inboxTab) {
      case "needsAction":
        return needsAction.length;
      case "confirmed":
        return confirmed.length;
      case "cancelled":
        return cancelled.length;
      case "messages":
        return messages.length;
      default:
        return payments.length;
    }
  }, [
    cancelled.length,
    confirmed.length,
    inboxTab,
    messages.length,
    needsAction.length,
    payments.length,
  ]);

  const pagination = getPaginationMeta(page, activeListLength, pageSize);

  useEffect(() => {
    setPage(1);
  }, [inboxTab, pageSize, reservations, payments, guestFeedback]);

  useEffect(() => {
    if (page > pagination.totalPages) setPage(pagination.totalPages);
  }, [page, pagination.totalPages]);

  const paginatedReservations = useMemo(() => {
    if (
      inboxTab === "paymentsLedger" ||
      inboxTab === "messages"
    ) {
      return [];
    }
    const list =
      inboxTab === "needsAction"
        ? needsAction
        : inboxTab === "confirmed"
          ? confirmed
          : cancelled;
    const start = (pagination.safePage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [
    cancelled,
    confirmed,
    inboxTab,
    needsAction,
    pageSize,
    pagination.safePage,
  ]);

  const paginatedMessages = useMemo(() => {
    if (inboxTab !== "messages") return [];
    const start = (pagination.safePage - 1) * pageSize;
    return messages.slice(start, start + pageSize);
  }, [inboxTab, messages, pageSize, pagination.safePage]);

  const paginatedPayments = useMemo(() => {
    if (inboxTab !== "paymentsLedger") return [];
    const start = (pagination.safePage - 1) * pageSize;
    return payments.slice(start, start + pageSize);
  }, [inboxTab, pageSize, pagination.safePage, payments]);

  function handlePageChange(next: number) {
    setPage(next);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const emptyMessage =
    inboxTab === "needsAction"
      ? t("inbox.emptyNeedsAction")
      : inboxTab === "messages"
        ? t("inbox.emptyMessages")
        : inboxTab === "paymentsLedger"
          ? t("emptyPayments")
          : t("emptyReservations");

  return (
    <section ref={sectionRef} className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("inbox.title")}</h2>
        <p className="text-sm text-muted">{t("inbox.subtitle")}</p>
      </div>

      <DashboardTabBar
        label={t("inbox.tabsLabel")}
        active={inboxTab}
        onChange={setInboxTab}
        tabs={[
          {
            id: "needsAction" as const,
            label: t("inbox.needsAction"),
            count: tabCounts.needsAction,
          },
          {
            id: "confirmed" as const,
            label: t("filters.confirmed"),
            count: tabCounts.confirmed,
          },
          {
            id: "cancelled" as const,
            label: t("filters.cancelled"),
            count: tabCounts.cancelled,
          },
          {
            id: "messages" as const,
            label: t("inbox.messages"),
            count: tabCounts.messages,
          },
          {
            id: "paymentsLedger" as const,
            label: t("inbox.paymentsLedger"),
            count: tabCounts.paymentsLedger,
          },
        ]}
      />

      <DashboardPagination
        placement="header"
        page={page}
        totalItems={activeListLength}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />

      <div className="space-y-3">
        {activeListLength === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-8 text-center text-sm text-muted">
            {emptyMessage}
          </p>
        ) : inboxTab === "paymentsLedger" ? (
          paginatedPayments.map((p) => (
            <PaymentListCard
              key={p.id}
              payment={p}
              linkedReservation={
                p.reservationId
                  ? reservationsById.get(p.reservationId)
                  : undefined
              }
            />
          ))
        ) : inboxTab === "messages" ? (
          paginatedMessages.map((m) => (
            <GuestMessageCard key={m.id} message={m} />
          ))
        ) : (
          paginatedReservations.map((r) => (
            <InboxCaseCard
              key={r.id}
              reservation={r}
              successPayment={hasSuccessfulDeposit(r.id, paymentsByReservation)}
              showActions={inboxTab === "needsAction"}
              dashboardKey={dashboardKey}
              onUpdated={onReservationUpdated}
            />
          ))
        )}
      </div>

      <DashboardPagination
        page={page}
        totalItems={activeListLength}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </section>
  );
}
