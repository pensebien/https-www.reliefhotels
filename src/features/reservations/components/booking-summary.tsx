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
}: BookingSummaryProps) {
  const t = useTranslations("booking");
  const totalEstimate = calculateTotalEstimateNgn(
    itemType,
    priceFrom,
    nights,
    guests,
  );

  return (
    <div className="rounded-xl border border-border/70 bg-muted/10 p-4 sm:p-5">
      <p className="font-serif text-lg font-semibold text-foreground">{itemLabel}</p>

      {itemType === "room" && checkIn && checkOut ? (
        <p className="mt-2 text-sm text-muted">
          {formatStayDate(checkIn)} → {formatStayDate(checkOut)}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {itemType === "room" ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted">
              {t("nights")}
            </dt>
            <dd className="mt-1 font-medium text-foreground">{nights}</dd>
          </div>
        ) : (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted">
              {t("guests")}
            </dt>
            <dd className="mt-1 font-medium text-foreground">{guests}</dd>
          </div>
        )}

        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-muted">
            {t("totalEstimate")}
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {formatNaira(totalEstimate)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-border/60 pt-4">
        <p className="text-sm text-muted">{t("depositNote")}</p>
        <p className="mt-1 text-xl font-semibold text-teal-dark">
          {formatNaira(depositNgn)}
        </p>
      </div>
    </div>
  );
}
