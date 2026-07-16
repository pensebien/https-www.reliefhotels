"use client";

import {
  createFolioCharge,
  fetchFolioCharges,
  isFnbError,
  updateFolioChargeStatus,
} from "@/features/fnb/lib/api";
import type { FolioCharge, FolioChargeStatus } from "@/features/fnb/types";
import { useCallback, useEffect, useState } from "react";

export function useFolio(reservationId: string | null, key: string | null) {
  const [charges, setCharges] = useState<FolioCharge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const load = useCallback(async () => {
    if (!reservationId || !key) return;
    setLoading(true);
    setError(null);
    const result = await fetchFolioCharges(reservationId, key);
    if (isFnbError(result)) {
      setError(result.error);
      setCharges([]);
    } else {
      setCharges(result.charges ?? []);
    }
    setLoading(false);
  }, [reservationId, key]);

  useEffect(() => {
    // Async fetch — setState happens after the awaited response, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const addCharge = useCallback(
    async (sku: string, qty: number) => {
      if (!reservationId || !key) return false;
      setMutating(true);
      setError(null);
      const result = await createFolioCharge({ reservationId, sku, qty }, key);
      setMutating(false);
      if (isFnbError(result)) {
        setError(result.error);
        return false;
      }
      await load();
      return true;
    },
    [reservationId, key, load],
  );

  const setStatus = useCallback(
    async (id: string, status: FolioChargeStatus) => {
      if (!key) return false;
      setMutating(true);
      setError(null);
      const result = await updateFolioChargeStatus(id, status, key);
      setMutating(false);
      if (isFnbError(result)) {
        setError(result.error);
        return false;
      }
      await load();
      return true;
    },
    [key, load],
  );

  return { charges, loading, mutating, error, refresh: load, addCharge, setStatus };
}
