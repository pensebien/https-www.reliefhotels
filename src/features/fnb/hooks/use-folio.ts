"use client";

import {
  createFolioCharge,
  fetchFolioCharges,
  fetchTaxSettings,
  isFnbError,
  updateFolioChargeStatus,
} from "@/features/fnb/lib/api";
import type { FolioCharge, FolioChargeStatus, TaxSettings } from "@/features/fnb/types";
import { useCallback, useEffect, useState } from "react";

const FALLBACK_TAX_SETTINGS: TaxSettings = {
  vatPercentage: 7.5,
  collectionMode: "pass_through",
  updatedAt: new Date(0).toISOString(),
};

export function useFolio(reservationId: string | null, key: string | null) {
  const [charges, setCharges] = useState<FolioCharge[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(FALLBACK_TAX_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const load = useCallback(async () => {
    if (!reservationId || !key) return;
    setLoading(true);
    setError(null);
    const [chargesResult, taxResult] = await Promise.all([
      fetchFolioCharges(reservationId, key),
      fetchTaxSettings(key),
    ]);
    if (isFnbError(chargesResult)) {
      setError(chargesResult.error);
      setCharges([]);
    } else {
      setCharges(chargesResult.charges ?? []);
    }
    if (!isFnbError(taxResult) && taxResult.settings) {
      setTaxSettings(taxResult.settings);
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

  return {
    charges,
    taxSettings,
    loading,
    mutating,
    error,
    refresh: load,
    addCharge,
    setStatus,
  };
}
