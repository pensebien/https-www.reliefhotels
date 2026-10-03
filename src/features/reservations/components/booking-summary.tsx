"use client";

import type { GroupQuote } from "@/lib/booking-engine/group";
import type { StayQuote } from "@/lib/booking-engine/quote";
import { formatNaira } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { calculateTotalEstimateNgn } from "../lib/reservation-service";

type BookingSummaryProps = {
  itemLabel: string;
  checkIn?: string;
  checkOut?: string;
  nights: number;
  guests: number;
  depositNgn: number;
  priceFrom: number;
  emphasizeDeposit?: boolean;
  editableStay?: boolean;
  onNightsChange?: (nights: number) => void;
  onGuestsChange?: (guests: number) => void;
  footnote?: string;
  rooms?: number;
  maxGuests?: number;
  onRoomsChange?: (rooms: number) => void;
  /** Server quote; when present its lines replace the flat-rate estimate. */
  quote?: StayQuote | null;
  /** Group booking quote; replaces the single-room lines when present. */
  groupQuote?: GroupQuote | null;
  /** Room id → display name, for group lines. */
  roomLabels?: Record<string, string>;
  quoteError?: string | null;
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

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  id,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </label>
      <div className="mt-1.5 inline-flex items-center gap-1 rounded-xl border border-border bg-background p-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted/40 disabled:opacity-40"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="h-9 w-12 border-0 bg-transparent text-center text-sm font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted/40 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function QuoteLines({ quote }: { quote: StayQuote }) {
  const t = useTranslations("booking");
  const nightly = new Set(quote.perNight.map((n) => n.nightlyNgn));
  const lines: [string, number][] = [
    [
      nightly.size === 1
        ? t("roomLine", {
            nights: quote.nights,
            rooms: quote.rooms,
            rate: formatNaira(quote.perNight[0].nightlyNgn),
          })
        : t("roomLineVaried", { nights: quote.nights, rooms: quote.rooms }),
      quote.roomSubtotalNgn,
    ],
  ];
  if (quote.longStayDiscountNgn) lines.push([t("longStayLine"), -quote.longStayDiscountNgn]);
  if (quote.couponDiscountNgn) {
    lines.push([t("couponLine", { code: quote.couponCode ?? "" }), -quote.couponDiscountNgn]);
  }
  for (const extra of quote.extras) lines.push([extra.label, extra.totalNgn]);

  return (
    <div className="space-y-1.5 border-t border-border/60 pt-3 text-sm sm:col-span-2">
      {lines.map(([label, amount]) => (
        <div key={label} className="flex justify-between gap-4">
          <span className="text-muted">{label}</span>
          <span className={amount < 0 ? "text-teal-dark" : "text-foreground"}>
            {amount < 0 ? `− ${formatNaira(-amount)}` : formatNaira(amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BookingSummary({
  itemLabel,
  checkIn,
  checkOut,
  nights,
  guests,
  depositNgn,
  priceFrom,
  emphasizeDeposit = false,
  editableStay = false,
  onNightsChange,
  onGuestsChange,
  footnote,
  rooms = 1,
  maxGuests = 12,
  onRoomsChange,
  quote,
  groupQuote,
  roomLabels = {},
  quoteError,
}: BookingSummaryProps) {
  const t = useTranslations("booking");
  const depositPct = quote?.depositPct ?? 20;
  const totalEstimate = groupQuote?.totalNgn ?? quote?.totalNgn ?? calculateTotalEstimateNgn(priceFrom, nights) * rooms;

  return (
    <div
      className={
        emphasizeDeposit
          ? "rounded-xl border-2 border-teal/30 bg-teal/5 p-4 sm:p-5"
          : "rounded-xl border border-border/70 bg-muted/10 p-4 sm:p-5"
      }
    >
      <p className="font-serif text-lg font-semibold text-foreground">{itemLabel}</p>

      {checkIn && checkOut ? (
        <p className="mt-2 text-sm text-muted">
          {formatStayDate(checkIn)} → {formatStayDate(checkOut)}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {editableStay && onNightsChange && onGuestsChange ? (
          <>
            <Stepper
              id="booking-nights"
              label={t("nights")}
              value={nights}
              min={1}
              max={30}
              onChange={onNightsChange}
            />
            <Stepper
              id="booking-guests"
              label={t("guests")}
              value={guests}
              min={1}
              max={maxGuests}
              onChange={onGuestsChange}
            />
            {onRoomsChange ? (
              <Stepper
                id="booking-rooms"
                label={t("rooms")}
                value={rooms}
                min={1}
                max={4}
                onChange={onRoomsChange}
              />
            ) : null}
          </>
        ) : (
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
            {rooms > 1 ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted">
                  {t("rooms")}
                </dt>
                <dd className="mt-1 font-medium text-foreground">{rooms}</dd>
              </div>
            ) : null}
          </>
        )}
        {groupQuote ? (
          <div className="space-y-1.5 border-t border-border/60 pt-3 text-sm sm:col-span-2">
            {groupQuote.lines.map((line) => (
              <div key={line.roomId} className="flex justify-between gap-4">
                <span className="text-muted">
                  {t("groupLine", { rooms: line.rooms, room: roomLabels[line.roomId] ?? line.roomId, nights: line.nights })}
                </span>
                <span className="text-foreground">{formatNaira(line.totalNgn)}</span>
              </div>
            ))}
          </div>
        ) : quote ? (
          <QuoteLines quote={quote} />
        ) : null}
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wider text-muted">
            {t("totalStayEstimate")}
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {formatNaira(totalEstimate)}
          </dd>
        </div>
      </dl>
      {quoteError ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {quoteError}
        </p>
      ) : null}

      <div
        className={
          emphasizeDeposit
            ? "mt-4 rounded-lg border border-teal/20 bg-background/80 px-4 py-3"
            : "mt-4 border-t border-border/60 pt-4"
        }
      >
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {t("depositDueNow", { pct: depositPct })}
        </p>
        <p className="mt-1 text-2xl font-semibold text-teal-dark">
          {formatNaira(depositNgn)}
        </p>
        <p className="mt-1 text-xs text-muted">{t("depositNote", { pct: depositPct })}</p>
        {footnote ? (
          <p className="mt-3 border-t border-teal/20 pt-3 text-xs text-muted">
            {footnote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
