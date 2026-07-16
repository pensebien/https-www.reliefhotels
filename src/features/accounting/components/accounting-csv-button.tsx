"use client";

import { ledgerRowsToCsv, type LedgerRow } from "@/lib/accounting/ledger";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

function downloadCsv(rows: readonly LedgerRow[], filename: string) {
  const csv = ledgerRowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AccountingCsvButton({ rows }: { rows: LedgerRow[] }) {
  const t = useTranslations("accounting");

  const handleClick = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(rows, `relief-hotels-ledger-${stamp}.csv`);
  }, [rows]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={rows.length === 0}
      className="inline-flex items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm hover:border-teal disabled:opacity-50"
    >
      <Download className="h-4 w-4" aria-hidden />
      {t("downloadCsv")}
    </button>
  );
}
