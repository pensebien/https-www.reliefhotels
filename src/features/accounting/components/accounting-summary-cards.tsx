"use client";

import type { LedgerChannelSummary } from "@/lib/accounting/ledger";
import { formatNaira } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function AccountingSummaryCards({
  summary,
}: {
  summary: LedgerChannelSummary;
}) {
  const t = useTranslations("accounting");

  const cards: Array<{ key: string; label: string; amount: number; highlight?: boolean }> = [
    { key: "cash", label: t("summary.cash"), amount: summary.cash },
    { key: "paystack", label: t("summary.paystack"), amount: summary.paystack },
    { key: "moniepoint", label: t("summary.moniepoint"), amount: summary.moniepoint },
    {
      key: "total",
      label: t("summary.total"),
      amount: summary.totalNgn,
      highlight: true,
    },
  ];

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={
            card.highlight
              ? "rounded-xl border border-teal bg-teal/10 p-4"
              : "rounded-xl border border-border bg-card p-4"
          }
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {card.label}
          </p>
          <p className="mt-1 text-2xl font-medium">{formatNaira(card.amount)}</p>
        </div>
      ))}
    </div>
  );
}
