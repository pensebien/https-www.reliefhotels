"use client";

import { fetchCashierQueue, isCashierError } from "@/features/cashier/lib/api";
import { isUnsettledReservation } from "@/features/cashier/lib/helpers";
import type {
  CashierPayment,
  CashierReservation,
} from "@/features/cashier/types";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useCashierQueue(key: string | null) {
  const [reservations, setReservations] = useState<CashierReservation[]>([]);
  const [payments, setPayments] = useState<CashierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notDeployed, setNotDeployed] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = useCallback(async (loadKey: string) => {
    setLoading(true);
    setError(null);
    setNotDeployed(false);
    const result = await fetchCashierQueue(loadKey);
    if (isCashierError(result)) {
      setError(result.error);
      setNotDeployed(Boolean(result.notDeployed));
      setReservations([]);
      setPayments([]);
    } else {
      setReservations(result.reservations ?? []);
      setPayments(result.payments ?? []);
    }
    setLoading(false);
    setLoadedOnce(true);
  }, []);

  useEffect(() => {
    if (!key) return;
    load(key);
  }, [key, load]);

  const successfulPaymentReservationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const payment of payments) {
      if (payment.status === "success" && payment.reservationId) {
        ids.add(payment.reservationId);
      }
    }
    return ids;
  }, [payments]);

  const unsettledReservations = useMemo(() => {
    return reservations
      .filter((reservation) =>
        isUnsettledReservation(
          reservation,
          successfulPaymentReservationIds.has(reservation.id),
        ),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [reservations, successfulPaymentReservationIds]);

  return {
    loading,
    error,
    notDeployed,
    loadedOnce,
    unsettledReservations,
    refresh: () => key && load(key),
  };
}
