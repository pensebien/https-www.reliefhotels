"use client";

import { CashierKeyForm } from "@/features/cashier/components/cashier-key-form";
import { CashierQueueList } from "@/features/cashier/components/cashier-queue-list";
import { CashierSettlePanel } from "@/features/cashier/components/cashier-settle-panel";
import { useCashierQueue } from "@/features/cashier/hooks/use-cashier-queue";
import type { CashierReservation } from "@/features/cashier/types";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";

export function CashierClient() {
  const t = useTranslations("cashier");
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("key");

  const [key, setKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<CashierReservation | null>(null);

  useEffect(() => {
    const resolved =
      keyFromUrl ??
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem(SESSION_STORAGE_KEY)
        : null) ??
      DEFAULT_KEY;
    setKey(resolved);
  }, [keyFromUrl]);

  const { loading, error, notDeployed, loadedOnce, unsettledReservations, refresh } =
    useCashierQueue(key);

  const hasData = loadedOnce && !error;

  function handleKeySubmit(nextKey: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextKey);
    }
    setSelected(null);
    setKey(nextKey);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-muted">{t("subtitle")}</p>
        </div>
        {hasData ? (
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            {t("refresh")}
          </button>
        ) : null}
      </div>

      {key !== null && (
        <CashierKeyForm
          key={key}
          initialKey={key}
          loading={loading}
          onSubmit={handleKeySubmit}
          placeholder={t("keyPlaceholder")}
          submitLabel={t("unlock")}
        />
      )}

      {error && (
        <p className="mb-6 text-sm text-red-600">
          {notDeployed ? t("notDeployed") : error}
        </p>
      )}

      {hasData && !selected && (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            {t("queueTitle")}
          </h2>
          <CashierQueueList
            reservations={unsettledReservations}
            selectedId={null}
            onSelect={setSelected}
          />
        </>
      )}

      {hasData && selected && key && (
        <CashierSettlePanel
          reservation={selected}
          cashierKey={key}
          onBack={() => setSelected(null)}
          onSettled={() => {
            setSelected(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
