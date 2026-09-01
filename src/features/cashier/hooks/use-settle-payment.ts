"use client";

import {
  fetchCashierSettleStatus,
  isCashierError,
  settleCashierPayment,
} from "@/features/cashier/lib/api";
import type {
  CashierSettleRequest,
  CashierSettleResponse,
} from "@/features/cashier/types";
import { useCallback, useEffect, useRef, useState } from "react";

export type SettleStage =
  | "idle"
  | "submitting"
  | "polling"
  | "success"
  | "failed"
  | "error";

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 24; // ~1 minute

/** How long a Card/Transfer settle polls before giving up — keep any countdown UI in sync with this. */
export const SETTLE_POLL_TIMEOUT_SECONDS = (MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000;

export function useSettlePayment(key: string | null) {
  const [stage, setStage] = useState<SettleStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notDeployed, setNotDeployed] = useState(false);
  const [result, setResult] = useState<CashierSettleResponse | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  // Ref indirection lets the poll loop call itself recursively without a
  // self-referential useCallback (which the React compiler linter rejects).
  const pollRef = useRef<(reference: string) => void>(() => {});

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    pollRef.current = (reference: string) => {
      if (!key) return;
      attemptsRef.current += 1;
      if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
        setStage("failed");
        setError("Timed out waiting for terminal confirmation. Check the terminal and try again.");
        return;
      }
      timerRef.current = setTimeout(async () => {
        const statusResult = await fetchCashierSettleStatus(reference, key);
        if (isCashierError(statusResult)) {
          setStage("error");
          setNotDeployed(Boolean(statusResult.notDeployed));
          setError(statusResult.error);
          return;
        }
        if (statusResult.status === "success") {
          setStage("success");
          setResult((prev) => ({ ...(prev ?? { ok: true }), ...statusResult, ok: true }));
          return;
        }
        if (statusResult.status === "failed") {
          setStage("failed");
          setError("Payment failed or was declined at the terminal.");
          return;
        }
        pollRef.current(reference);
      }, POLL_INTERVAL_MS);
    };
  }, [key]);

  const submit = useCallback(
    async (payload: Omit<CashierSettleRequest, "clientMutationId">) => {
      if (!key) {
        setStage("error");
        setError("Missing cashier key.");
        return;
      }
      clearTimer();
      attemptsRef.current = 0;
      setStage("submitting");
      setError(null);
      setNotDeployed(false);
      setResult(null);

      const clientMutationId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `cm_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      // Offline cash: queue locally (Agent J outbox) and sync when back online.
      if (
        typeof navigator !== "undefined" &&
        !navigator.onLine &&
        payload.paymentMethod === "cash"
      ) {
        try {
          const { enqueueSettle, flushOutbox } = await import(
            "@/lib/cashier-offline"
          );
          await enqueueSettle({
            reservationId: payload.reservationId,
            amountNgn: payload.amountNgn,
            paymentMethod: "cash",
            clientMutationId,
            note: payload.note,
          });
          setStage("success");
          setResult({
            ok: true,
            status: "success",
            reference: clientMutationId,
            provider: "cash",
            queuedOffline: true,
          });
          const onOnline = () => {
            void flushOutbox(fetch, { key: key ?? undefined });
            window.removeEventListener("online", onOnline);
          };
          window.addEventListener("online", onOnline);
          return;
        } catch {
          // Fall through to online settle attempt
        }
      }

      const settleResult = await settleCashierPayment(
        { ...payload, clientMutationId },
        key,
      );

      if (isCashierError(settleResult)) {
        setStage("error");
        setNotDeployed(Boolean(settleResult.notDeployed));
        setError(settleResult.error);
        return;
      }

      setResult(settleResult);

      if (settleResult.status === "success") {
        setStage("success");
        return;
      }

      if (settleResult.status === "pending" && settleResult.reference) {
        setStage("polling");
        pollRef.current(settleResult.reference);
        return;
      }

      if (!settleResult.ok) {
        setStage("error");
        setError(settleResult.error ?? "Settlement failed.");
        return;
      }

      setStage("success");
    },
    [clearTimer, key],
  );

  const reset = useCallback(() => {
    clearTimer();
    attemptsRef.current = 0;
    setStage("idle");
    setError(null);
    setNotDeployed(false);
    setResult(null);
  }, [clearTimer]);

  return { stage, error, notDeployed, result, submit, reset };
}
