"use client";

import { DashboardPagination, getPaginationMeta } from "@/components/dashboard-date-pagination";
import type { DashboardGuestFeedbackRow } from "@/components/staff/dashboard-inbox-view";
import {
  BookingListCard,
  DashboardTabBar,
  PaymentListCard,
  ContactActions,
  formatDashboardDate,
  type DashboardPaymentRow,
  type DashboardReservationRow,
} from "@/components/staff/dashboard-shared";
import { StaffReservationActions } from "@/components/staff/staff-reservation-actions";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

type EntityTab = "bookings" | "payments" | "messages";
type BookingStatusTab = "pending" | "confirmed" | "cancelled";
type PaymentStatusTab = "pending" | "success" | "failed" | "all";

function matchesPaymentStatus(
  status: string,
  tab: PaymentStatusTab,
): boolean {
  if (tab === "all") return true;
  if (tab === "success") return status === "success";
  if (tab === "failed") return status === "failed" || status === "abandoned";
  return status === "pending";
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

export function DashboardListsView({
  reservations,
  payments,
  guestFeedback = [],
  paymentsByReservation,
  reservationsById,
  pageSize,
  defaultEntityTab = "bookings",
  defaultBookingStatus = "pending",
  dashboardKey,
  onReservationUpdated,
}: {
  reservations: DashboardReservationRow[];
  payments: DashboardPaymentRow[];
  guestFeedback?: DashboardGuestFeedbackRow[];
  paymentsByReservation: Map<string, DashboardPaymentRow[]>;
  reservationsById: Map<string, DashboardReservationRow>;
  pageSize: number;
  defaultEntityTab?: EntityTab;
  defaultBookingStatus?: BookingStatusTab;
  dashboardKey: string;
  onReservationUpdated: () => void;
}) {
  const t = useTranslations("demo");
  const sectionRef = useRef<HTMLElement>(null);

  const [entityTab, setEntityTab] = useState<EntityTab>(defaultEntityTab);
  const [bookingStatus, setBookingStatus] =
    useState<BookingStatusTab>(defaultBookingStatus);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusTab>("pending");
  const [page, setPage] = useState(1);

  const bookingCounts = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, cancelled: 0 };
    for (const r of reservations) {
      counts[r.status] += 1;
    }
    return counts;
  }, [reservations]);

  const paymentCounts = useMemo(() => {
    const counts = { pending: 0, success: 0, failed: 0, all: payments.length };
    for (const p of payments) {
      if (p.status === "success") counts.success += 1;
      else if (p.status === "failed" || p.status === "abandoned") counts.failed += 1;
      else if (p.status === "pending") counts.pending += 1;
    }
    return counts;
  }, [payments]);

  const messages = useMemo(
    () =>
      [...guestFeedback].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [guestFeedback],
  );

  const filteredBookings = useMemo(
    () => reservations.filter((r) => r.status === bookingStatus),
    [reservations, bookingStatus],
  );

  const filteredPaymentsList = useMemo(
    () => payments.filter((p) => matchesPaymentStatus(p.status, paymentStatus)),
    [payments, paymentStatus],
  );

  const activeListLength =
    entityTab === "bookings"
      ? filteredBookings.length
      : entityTab === "payments"
        ? filteredPaymentsList.length
        : messages.length;

  const pagination = getPaginationMeta(page, activeListLength, pageSize);

  useEffect(() => {
    setPage(1);
  }, [
    entityTab,
    bookingStatus,
    paymentStatus,
    pageSize,
    reservations,
    payments,
    guestFeedback,
  ]);

  useEffect(() => {
    if (page > pagination.totalPages) setPage(pagination.totalPages);
  }, [page, pagination.totalPages]);

  const paginatedBookings = useMemo(() => {
    const start = (pagination.safePage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, pageSize, pagination.safePage]);

  const paginatedPayments = useMemo(() => {
    const start = (pagination.safePage - 1) * pageSize;
    return filteredPaymentsList.slice(start, start + pageSize);
  }, [filteredPaymentsList, pageSize, pagination.safePage]);

  const paginatedMessages = useMemo(() => {
    const start = (pagination.safePage - 1) * pageSize;
    return messages.slice(start, start + pageSize);
  }, [messages, pageSize, pagination.safePage]);

  function handlePageChange(next: number) {
    setPage(next);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const emptyMessage =
    entityTab === "bookings"
      ? bookingStatus === "pending"
        ? t("emptyPendingBookings")
        : t("emptyReservations")
      : entityTab === "messages"
        ? t("inbox.emptyMessages")
        : t("emptyPayments");

  return (
    <section ref={sectionRef} className="scroll-mt-24 space-y-4">
      <DashboardTabBar
        label={t("entityTabsLabel")}
        active={entityTab}
        onChange={setEntityTab}
        tabs={[
          {
            id: "bookings" as const,
            label: t("entityBookings"),
            count: reservations.length,
          },
          {
            id: "messages" as const,
            label: t("inbox.messages"),
            count: messages.length,
          },
          {
            id: "payments" as const,
            label: t("entityPayments"),
            count: payments.length,
          },
        ]}
      />

      {entityTab === "bookings" ? (
        <DashboardTabBar
          label={t("bookingStatusTabsLabel")}
          active={bookingStatus}
          onChange={setBookingStatus}
          tabs={(
            ["pending", "confirmed", "cancelled"] as const
          ).map((status) => ({
            id: status,
            label: t(`filters.${status}`),
            count: bookingCounts[status],
          }))}
        />
      ) : entityTab === "payments" ? (
        <DashboardTabBar
          label={t("paymentStatusTabsLabel")}
          active={paymentStatus}
          onChange={setPaymentStatus}
          tabs={(
            [
              { id: "pending" as const, label: t("paymentStatus.pending") },
              { id: "success" as const, label: t("paymentStatus.success") },
              { id: "failed" as const, label: t("paymentStatus.failed") },
              { id: "all" as const, label: t("filters.all") },
            ] as const
          ).map((tab) => ({
            ...tab,
            count: paymentCounts[tab.id],
          }))}
        />
      ) : null}

      <DashboardPagination
        placement="header"
        page={page}
        totalItems={activeListLength}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />

      <div className="space-y-3">
        {activeListLength === 0 ? (
          <p className="text-sm text-muted">{emptyMessage}</p>
        ) : entityTab === "bookings" ? (
          paginatedBookings.map((r) => {
            const linked = paymentsByReservation.get(r.id) ?? [];
            const successPayment = linked.find((p) => p.status === "success");
            return (
              <div key={r.id} className="space-y-0">
                <BookingListCard
                  reservation={r}
                  successPayment={successPayment}
                />
                {bookingStatus === "pending" ? (
                  <div className="rounded-b-xl border border-t-0 border-border bg-card/60 px-4 pb-4">
                    <StaffReservationActions
                      reservationId={r.id}
                      dashboardKey={dashboardKey}
                      source={r.source}
                      staffNotes={r.staffNotes}
                      onUpdated={onReservationUpdated}
                      compact
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        ) : entityTab === "messages" ? (
          paginatedMessages.map((m) => (
            <GuestMessageCard key={m.id} message={m} />
          ))
        ) : (
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
