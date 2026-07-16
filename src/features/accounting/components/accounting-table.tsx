"use client";

import type { LedgerChannel, LedgerRow } from "@/lib/accounting/ledger";
import { cn, formatNaira } from "@/lib/utils";
import { useTranslations } from "next-intl";

const CHANNEL_BADGE_CLASSES: Record<LedgerChannel, string> = {
  cash: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  paystack: "bg-teal/20 text-teal-dark",
  moniepoint: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
};

function formatRowDate(dateYmd: string): string {
  const [y, m, d] = dateYmd.split("-").map(Number);
  if (!y || !m || !d) return dateYmd;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export function AccountingTable({ rows }: { rows: LedgerRow[] }) {
  const t = useTranslations("accounting");

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-medium">{t("tableEmpty")}</p>
        <p className="mt-1 text-sm text-muted">{t("tableEmptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card/50">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="sr-only">{t("tableCaption")}</caption>
        <thead>
          <tr className="border-b border-border bg-card/80">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              {t("table.date")}
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              {t("table.reference")}
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              {t("table.description")}
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              {t("table.channel")}
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              {t("table.status")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {t("table.amount")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60">
              <td className="px-3 py-2 whitespace-nowrap text-muted">
                {formatRowDate(row.dateYmd)}
              </td>
              <td className="px-3 py-2 font-mono text-xs">{row.reference ?? "—"}</td>
              <td className="px-3 py-2">{row.description}</td>
              <td className="px-3 py-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    CHANNEL_BADGE_CLASSES[row.channel],
                  )}
                >
                  {row.channel}
                </span>
              </td>
              <td className="px-3 py-2 capitalize text-muted">{row.status}</td>
              <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                {formatNaira(row.amountNgn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
