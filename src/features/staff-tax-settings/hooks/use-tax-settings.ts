"use client";

import {
  fetchTaxSettings,
  isTaxSettingsError,
  patchTaxSettings,
} from "@/features/staff-tax-settings/lib/api";
import type {
  TaxCollectionMode,
  TaxSettings,
} from "@/features/staff-tax-settings/types";
import { useCallback, useEffect, useState } from "react";

export function useTaxSettings(key: string | null) {
  const [settings, setSettings] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = useCallback(async (loadKey: string | undefined) => {
    setLoading(true);
    setError(null);
    const result = await fetchTaxSettings(loadKey);
    if (isTaxSettingsError(result)) {
      setError(result.error);
      setForbidden(Boolean(result.forbidden));
    } else {
      setSettings(result.settings);
      setForbidden(false);
    }
    setLoading(false);
    setLoadedOnce(true);
  }, []);

  useEffect(() => {
    if (key === null) return;
    load(key ?? undefined);
  }, [key, load]);

  const save = useCallback(
    async (patch: { vatPercentage?: number; collectionMode?: TaxCollectionMode }) => {
      setSaving(true);
      setError(null);
      const result = await patchTaxSettings(key ?? undefined, patch);
      setSaving(false);
      if (isTaxSettingsError(result)) {
        setError(result.error);
        setForbidden(Boolean(result.forbidden));
        return false;
      }
      setSettings(result.settings);
      return true;
    },
    [key],
  );

  return { settings, loading, saving, error, forbidden, loadedOnce, save };
}
