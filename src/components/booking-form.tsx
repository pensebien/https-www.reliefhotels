"use client";

import { PaystackCheckout } from "@/components/paystack-checkout";
import { rooms, tours } from "@/content/site";
import { formatNaira } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type BookingFormProps = {
  itemType: "room" | "tour";
  itemId: string;
  itemLabel: string;
  defaultNights?: number;
  defaultGuests?: number;
};

export function BookingForm({
  itemType,
  itemId,
  itemLabel,
  defaultNights = 2,
  defaultGuests = 2,
}: BookingFormProps) {
  const t = useTranslations("booking");
  const [email, setEmail] = useState("demo.guest@example.com");
  const [nights, setNights] = useState(defaultNights);
  const [guests, setGuests] = useState(defaultGuests);

  const item = useMemo(() => {
    if (itemType === "room") {
      return rooms.find((r) => r.id === itemId || r.slug === itemId);
    }
    return tours.find((tour) => tour.id === itemId || tour.slug === itemId);
  }, [itemType, itemId]);

  if (!item) return null;

  const depositNgn =
    itemType === "room"
      ? Math.round(item.priceFrom * nights * 0.2)
      : item.priceFrom * guests;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h3 className="font-serif text-2xl font-semibold">{t("title")}</h3>
      <p className="mt-1 text-muted">{itemLabel}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="book-email" className="text-xs font-medium uppercase tracking-wider text-muted">
            {t("email")}
          </label>
          <input
            id="book-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>

        {itemType === "room" ? (
          <div className="space-y-2">
            <label htmlFor="nights" className="text-xs font-medium uppercase tracking-wider text-muted">
              {t("nights")}
            </label>
            <input
              id="nights"
              type="number"
              min={1}
              max={14}
              value={nights}
              onChange={(e) => setNights(Number(e.target.value))}
              className="h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-teal"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="guests" className="text-xs font-medium uppercase tracking-wider text-muted">
              {t("guests")}
            </label>
            <input
              id="guests"
              type="number"
              min={1}
              max={12}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-teal"
            />
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl bg-muted/10 px-4 py-3">
        <p className="text-sm text-muted">{t("depositNote")}</p>
        <p className="mt-1 text-xl font-semibold text-teal-dark">
          {formatNaira(depositNgn)}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
        <PaystackCheckout
          email={email}
          itemType={itemType}
          itemId={item.id}
          nights={itemType === "room" ? nights : undefined}
          guests={itemType === "tour" ? guests : undefined}
          label={t("payDeposit")}
          className="flex-1"
        />
        <PaystackCheckout
          email={email}
          itemType={itemType}
          itemId={item.id}
          label={t("payTest")}
          useDemoTestAmount
          className="flex-1"
        />
      </div>
    </div>
  );
}
