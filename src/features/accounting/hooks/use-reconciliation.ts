"use client";

import { fetchReconciliation, isAccountingError } from "@/features/accounting/lib/api";
import type { ReconcileResponse } from "@/features/accounting/types";
import { useCallback, useState } from "react";

export function useReconciliation(key: string | null) {
  const [result, setResult] = useState<ReconcileResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const run = useCallback(
    async (range: { from?: string; to?: string }) => {
      if (!key) return;
      if (!range.from || !range.to) {
        setError("Pick a date range first.");
        return;
      }
      setRunning(true);
      setError(null);
      setForbidden(false);
      const outcome = await fetchReconciliation(key, {
        from: range.from,
        to: range.to,
      });
      if (isAccountingError(outcome)) {
        setError(outcome.error);
        setForbidden(Boolean(outcome.forbidden));
        setResult(null);
      } else {
        setResult(outcome);
      }
      setRunning(false);
    },
    [key],
  );

  return { result, running, error, forbidden, run, reset: () => setResult(null) };
}
