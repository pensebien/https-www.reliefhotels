"use client";

import { FnbCatalogBrowser } from "@/features/fnb/components/fnb-catalog-browser";
import { FnbFolioList } from "@/features/fnb/components/fnb-folio-list";
import { useFolio } from "@/features/fnb/hooks/use-folio";
import {
  formatCashierDate,
  guestFullName,
} from "@/features/cashier/lib/helpers";
import type { CashierReservation } from "@/features/cashier/types";
import { useTranslations } from "next-intl";

export function CashierFnbPanel({
  reservation,
  cashierKey,
  onBack,
}: {
  reservation: CashierReservation;
  cashierKey: string;
  onBack: () => void;
}) {
  const t = useTranslations("cashier");
  const tFnb = useTranslations("fnb");
  const { charges, taxSettings, loading, mutating, error, addCharge, setStatus } =
    useFolio(reservation.id, cashierKey);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm text-muted">{t("guestLabel")}</p>
          <p className="font-medium">{guestFullName(reservation)}</p>
          <p className="text-sm text-muted">{reservation.email}</p>
          {reservation.checkIn ? (
            <p className="mt-2 text-xs text-muted">
              {formatCashierDate(reservation.checkIn)}
              {reservation.checkOut
                ? ` → ${formatCashierDate(reservation.checkOut)}`
                : ""}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs hover:border-teal"
        >
          {t("changeSelection")}
        </button>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
        {tFnb("folioTitle")}
      </h2>
      {loading ? (
        <p className="mb-6 text-sm text-muted">{tFnb("loadingFolio")}</p>
      ) : (
        <div className="mb-6">
          <FnbFolioList
            charges={charges}
            disabled={mutating}
            onSetStatus={(id, status) => setStatus(id, status)}
            taxSettings={taxSettings}
          />
        </div>
      )}

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
        {t("fnbCatalogTitle")}
      </h2>
      <FnbCatalogBrowser
        disabled={mutating}
        onAdd={(sku, qty) => addCharge(sku, qty)}
      />
    </div>
  );
}
