"use client";

import { DashboardPagination } from "@/components/dashboard-date-pagination";
import {
  BookingListCard,
  DashboardTabBar,
  PaymentListCard,
  type DashboardPaymentRow,
  type DashboardReservationRow,
} from "@/components/staff/dashboard-shared";
import { getPaginationMeta } from "@/components/dashboard-date-pagination";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

type EntityTab = "bookings" | "payments";
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

export function DashboardListsView({
  reservations,
  payments,
  paymentsByReservation,
  reservationsById,
  pageSize,
  defaultEntityTab = "bookings",
  defaultBookingStatus = "pending",
}: {
  reservations: DashboardReservationRow[];
  payments: DashboardPaymentRow[];
  paymentsByReservation: Map<string, DashboardPaymentRow[]>;
  reservationsById: Map<string, DashboardReservationRow>;
  pageSize: number;
  defaultEntityTab?: EntityTab;
  defaultBookingStatus?: BookingStatusTab;
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

  const filteredBookings = useMemo(
    () => reservations.filter((r) => r.status === bookingStatus),
    [reservations, bookingStatus],
  );

  const filteredPaymentsList = useMemo(
    () => payments.filter((p) => matchesPaymentStatus(p.status, paymentStatus)),
    [payments, paymentStatus],
  );

  const activeList =
    entityTab === "bookings" ? filteredBookings : filteredPaymentsList;

  const pagination = getPaginationMeta(page, activeList.length, pageSize);

  useEffect(() => {
    setPage(1);
  }, [entityTab, bookingStatus, paymentStatus, pageSize, reservations, payments]);

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

  function handlePageChange(next: number) {
    setPage(next);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const emptyMessage =
    entityTab === "bookings"
      ? bookingStatus === "pending"
        ? t("emptyPendingBookings")
        : t("emptyReservations")
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
      ) : (
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
      )}

      <DashboardPagination
        placement="header"
        page={page}
        totalItems={activeList.length}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />

      <div className="space-y-3">
        {activeList.length === 0 ? (
          <p className="text-sm text-muted">{emptyMessage}</p>
        ) : entityTab === "bookings" ? (
          paginatedBookings.map((r) => {
            const linked = paymentsByReservation.get(r.id) ?? [];
            const successPayment = linked.find((p) => p.status === "success");
            return (
              <BookingListCard
                key={r.id}
                reservation={r}
                successPayment={successPayment}
              />
            );
          })
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
        totalItems={activeList.length}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </section>
  );
}
