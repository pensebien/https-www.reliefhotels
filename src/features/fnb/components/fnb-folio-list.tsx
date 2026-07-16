"use client";

import { folioChargeTotalNgn, formatFnbDate } from "@/features/fnb/lib/helpers";
import type { FolioCharge, FolioChargeStatus } from "@/features/fnb/types";
import { cn, formatNaira } from "@/lib/utils";
import { useTranslations } from "next-intl";

const STATUS_BADGE: Record<FolioChargeStatus, string> = {
  open: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  posted: "bg-blue-500/15 text-blue-800 dark:text-blue-200",
  paid: "bg-teal/20 text-teal-dark",
  void: "bg-gray-500/15 text-gray-600 dark:text-gray-300",
};

export function FnbFolioList({
  charges,
  disabled,
  onSetStatus,
}: {
  charges: FolioCharge[];
  disabled: boolean;
  onSetStatus: (id: string, status: FolioChargeStatus) => void;
}) {
  const t = useTranslations("fnb");

  const total = charges.reduce((sum, c) => sum + folioChargeTotalNgn(c), 0);
  const openBalance = charges
    .filter((c) => c.status === "open" || c.status === "posted")
    .reduce((sum, c) => sum + folioChargeTotalNgn(c), 0);

  if (charges.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-medium">{t("folioEmpty")}</p>
        <p className="mt-1 text-sm text-muted">{t("folioEmptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <ul className="divide-y divide-border">
        {charges.map((charge) => (
          <li
            key={charge.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {charge.qty} × {charge.name}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    STATUS_BADGE[charge.status],
                  )}
                >
                  {charge.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {formatNaira(charge.unitPriceNgn)} · {formatFnbDate(charge.createdAt.slice(0, 10))}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{formatNaira(folioChargeTotalNgn(charge))}</p>
              <div className="flex gap-1.5">
                {charge.status === "open" ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSetStatus(charge.id, "posted")}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:border-teal disabled:opacity-50"
                  >
                    {t("markPosted")}
                  </button>
                ) : null}
                {charge.status === "posted" ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSetStatus(charge.id, "paid")}
                    className="rounded-full bg-teal px-3 py-1 text-xs font-medium text-gray-950 hover:bg-teal-dark disabled:opacity-60"
                  >
                    {t("markPaid")}
                  </button>
                ) : null}
                {charge.status === "open" || charge.status === "posted" ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSetStatus(charge.id, "void")}
                    className="rounded-full border border-border px-3 py-1 text-xs text-red-600 hover:border-red-400 disabled:opacity-50"
                  >
                    {t("markVoid")}
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 text-sm">
        <span className="text-muted">{t("openBalance")}</span>
        <span className="font-medium">{formatNaira(openBalance)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4 text-sm">
        <span className="text-muted">{t("folioTotal")}</span>
        <span className="font-medium">{formatNaira(total)}</span>
      </div>
    </div>
  );
}
