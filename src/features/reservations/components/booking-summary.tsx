"use client";

import { formatNaira } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { calculateTotalEstimateNgn } from "../lib/reservation-service";

type BookingSummaryProps = {
  itemType: "room" | "tour";
  itemLabel: string;
  checkIn?: string;
  checkOut?: string;
  nights: number;
  guests: number;
  depositNgn: number;
  priceFrom: number;
  emphasizeDeposit?: boolean;
};

function formatStayDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function BookingSummary({
  itemType,
  itemLabel,
  checkIn,
  checkOut,
  nights,
  guests,
  depositNgn,
  priceFrom,
  emphasizeDeposit = false,
}: BookingSummaryProps) {
  const t = useTranslations("booking");
  const totalEstimate = calculateTotalEstimateNgn(
    itemType,
    priceFrom,
    nights,
    guests,
  );

  const totalLabel =
    itemType === "room" ? t("totalStayEstimate") : t("totalEstimate");

  return (
    <div
      className={
        emphasizeDeposit
          ? "rounded-xl border-2 border-teal/30 bg-teal/5 p-4 sm:p-5"
          : "rounded-xl border border-border/70 bg-muted/10 p-4 sm:p-5"
      }
    >
      <p className="font-serif text-lg font-semibold text-foreground">{itemLabel}</p>

      {itemType === "room" && checkIn && checkOut ? (
        <p className="mt-2 text-sm text-muted">
          {formatStayDate(checkIn)} → {formatStayDate(checkOut)}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {itemType === "room" ? (
          <>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted">
                {t("nights")}
              </dt>
              <dd className="mt-1 font-medium text-foreground">{nights}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted">
                {t("guests")}
              </dt>
              <dd className="mt-1 font-medium text-foreground">{guests}</dd>
            </div>
          </>
        ) : (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted">
              {t("guests")}
            </dt>
            <dd className="mt-1 font-medium text-foreground">{guests}</dd>
          </div>
        )}

        <div className={itemType === "tour" ? "" : "sm:col-span-2"}>
          <dt className="text-xs font-medium uppercase tracking-wider text-muted">
            {totalLabel}
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {formatNaira(totalEstimate)}
          </dd>
        </div>
      </dl>

      <div
        className={
          emphasizeDeposit
            ? "mt-4 rounded-lg border border-teal/20 bg-background/80 px-4 py-3"
            : "mt-4 border-t border-border/60 pt-4"
        }
      >
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {t("depositDueNow")}
        </p>
        <p className="mt-1 text-2xl font-semibold text-teal-dark">
          {formatNaira(depositNgn)}
        </p>
        {itemType === "room" ? (
          <p className="mt-1 text-xs text-muted">{t("depositNote")}</p>
        ) : null}
      </div>
    </div>
  );
}
