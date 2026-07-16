"use client";

import {
  fetchStaffCalendarActivity,
  isStaffCalendarError,
} from "@/features/staff-calendar/lib/api";
import type {
  CalendarReservation,
  EventInquiry,
  StaffCalendarPayment,
} from "@/features/staff-calendar/types";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useStaffCalendarActivity(key: string | null) {
  const [reservations, setReservations] = useState<CalendarReservation[]>([]);
  const [payments, setPayments] = useState<StaffCalendarPayment[]>([]);
  const [eventInquiries, setEventInquiries] = useState<EventInquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = useCallback(async (loadKey: string) => {
    setLoading(true);
    setError(null);
    const result = await fetchStaffCalendarActivity(loadKey);
    if (isStaffCalendarError(result)) {
      setError(result.error);
      setReservations([]);
      setPayments([]);
      setEventInquiries([]);
    } else {
      setReservations(result.reservations ?? []);
      setPayments(result.payments ?? []);
      setEventInquiries(result.eventInquiries ?? []);
    }
    setLoading(false);
    setLoadedOnce(true);
  }, []);

  useEffect(() => {
    if (!key) return;
    load(key);
  }, [key, load]);

  const paymentsByReservation = useMemo(() => {
    const map = new Map<string, StaffCalendarPayment[]>();
    for (const payment of payments) {
      if (!payment.reservationId) continue;
      const list = map.get(payment.reservationId) ?? [];
      list.push(payment);
      map.set(payment.reservationId, list);
    }
    return map;
  }, [payments]);

  return {
    loading,
    error,
    loadedOnce,
    reservations,
    eventInquiries,
    paymentsByReservation,
    refresh: () => key && load(key),
  };
}
