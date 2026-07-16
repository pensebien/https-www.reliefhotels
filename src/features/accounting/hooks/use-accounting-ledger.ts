"use client";

import {
  fetchAccountingActivity,
  isAccountingError,
} from "@/features/accounting/lib/api";
import type { AccountingPayment } from "@/features/accounting/types";
import {
  buildLedgerRows,
  filterLedgerRowsByDateRange,
  summarizeLedgerByChannel,
  summarizeLedgerByPaymentMethod,
  type LedgerDateRange,
  type LedgerRow,
} from "@/lib/accounting/ledger";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useAccountingLedger(key: string | null) {
  const [payments, setPayments] = useState<AccountingPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notDeployed, setNotDeployed] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [dateRange, setDateRange] = useState<LedgerDateRange>({});

  const load = useCallback(async (loadKey: string) => {
    setLoading(true);
    setError(null);
    setNotDeployed(false);
    const result = await fetchAccountingActivity(loadKey);
    if (isAccountingError(result)) {
      setError(result.error);
      setNotDeployed(Boolean(result.notDeployed));
      setPayments([]);
    } else {
      setPayments(result.payments ?? []);
    }
    setLoading(false);
    setLoadedOnce(true);
  }, []);

  useEffect(() => {
    if (!key) return;
    // `load` synchronizes local state with the remote activity feed whenever
    // the accounting key changes; it isn't a plain derived-state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(key);
  }, [key, load]);

  const allRows = useMemo<LedgerRow[]>(() => buildLedgerRows(payments), [payments]);

  const rows = useMemo<LedgerRow[]>(
    () => filterLedgerRowsByDateRange(allRows, dateRange),
    [allRows, dateRange],
  );

  const successfulRows = useMemo(
    () => rows.filter((row) => row.status === "success"),
    [rows],
  );

  const channelSummary = useMemo(
    () => summarizeLedgerByChannel(successfulRows),
    [successfulRows],
  );

  const methodSummary = useMemo(
    () => summarizeLedgerByPaymentMethod(successfulRows),
    [successfulRows],
  );

  return {
    loading,
    error,
    notDeployed,
    loadedOnce,
    rows,
    successfulRows,
    channelSummary,
    methodSummary,
    dateRange,
    setDateRange,
    refresh: () => key && load(key),
  };
}
