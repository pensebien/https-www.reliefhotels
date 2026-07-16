"use client";

import { fetchFnbReservations, isFnbError } from "@/features/fnb/lib/api";
import type { FnbReservation } from "@/features/fnb/types";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useFnbReservations(key: string | null) {
  const [reservations, setReservations] = useState<FnbReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notDeployed, setNotDeployed] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = useCallback(async (loadKey: string) => {
    setLoading(true);
    setError(null);
    setNotDeployed(false);
    const result = await fetchFnbReservations(loadKey);
    if (isFnbError(result)) {
      setError(result.error);
      setNotDeployed(Boolean(result.notDeployed));
      setReservations([]);
    } else {
      setReservations(result.reservations ?? []);
    }
    setLoading(false);
    setLoadedOnce(true);
  }, []);

  useEffect(() => {
    if (!key) return;
    // Async fetch — setState happens after the awaited response, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(key);
  }, [key, load]);

  const activeReservations = useMemo(() => {
    return reservations
      .filter((reservation) => reservation.status !== "cancelled")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [reservations]);

  return {
    loading,
    error,
    notDeployed,
    loadedOnce,
    activeReservations,
    refresh: () => key && load(key),
  };
}
