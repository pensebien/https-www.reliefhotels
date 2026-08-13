"use client";

import { useReconciliation } from "@/features/accounting/hooks/use-reconciliation";
import type { ReconcileDiscrepancy } from "@/features/accounting/types";
import { koboToNgn } from "@/lib/accounting/ledger";
import type { LedgerDateRange } from "@/lib/accounting/ledger";
import { formatNaira } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function AccountingReconcilePanel({
  accountingKey,
  dateRange,
}: {
  accountingKey: string | null;
  dateRange: LedgerDateRange;
}) {
  const t = useTranslations("accounting.reconcile");
  const { result, running, error, forbidden, run } = useReconciliation(accountingKey);

  const canRun = Boolean(dateRange.from && dateRange.to);

  return (
    <div className="mb-8 rounded-xl border border-border bg-card/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            {t("title")}
          </h2>
          <p className="mt-1 text-xs text-muted">{t("hint")}</p>
        </div>
        <button
          type="button"
          onClick={() => run(dateRange)}
          disabled={!canRun || running}
          className="rounded-full border border-border px-4 py-2 text-sm hover:border-teal disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? t("running") : t("run")}
        </button>
      </div>

      {!canRun && !result ? (
        <p className="mt-3 text-xs text-muted">{t("needsDateRange")}</p>
      ) : null}

      {forbidden ? <p className="mt-3 text-sm text-red-600">{t("forbidden")}</p> : null}
      {error && !forbidden ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {result?.demo ? (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{t("demoMode")}</p>
      ) : null}

      {result && !result.demo ? (
        <div className="mt-4">
          <p className="text-sm text-muted">
            {t("summary", {
              local: result.checkedLocalCount,
              remote: result.checkedRemoteCount,
              found: result.discrepancies.length,
            })}
          </p>

          {result.discrepancies.length === 0 ? (
            <p className="mt-3 text-sm text-teal-dark">{t("clean")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {result.discrepancies.map((d) => (
                <DiscrepancyRow key={`${d.type}-${d.reference}`} discrepancy={d} />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DiscrepancyRow({ discrepancy }: { discrepancy: ReconcileDiscrepancy }) {
  const t = useTranslations("accounting.reconcile");

  return (
    <li className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs">{discrepancy.reference}</span>
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100">
          {t(`type.${discrepancy.type}`)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {discrepancy.localAmountKobo !== undefined ? (
          <>
            {t("localAmount")}: {formatNaira(koboToNgn(discrepancy.localAmountKobo))}
            {" · "}
          </>
        ) : null}
        {discrepancy.paystackAmountKobo !== undefined ? (
          <>
            {t("paystackAmount")}: {formatNaira(koboToNgn(discrepancy.paystackAmountKobo))}
            {" · "}
          </>
        ) : null}
        {discrepancy.localStatus ? (
          <>
            {t("localStatus")}: {discrepancy.localStatus}
            {" · "}
          </>
        ) : null}
        {discrepancy.paystackStatus ? (
          <>
            {t("paystackStatus")}: {discrepancy.paystackStatus}
          </>
        ) : null}
      </p>
    </li>
  );
}
