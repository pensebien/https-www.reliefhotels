"use client";

import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { cn } from "@/lib/utils";
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { ArrowRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type DateRange, DayPicker } from "react-day-picker";
import { enUS as rdpEn, fr as rdpFr } from "react-day-picker/locale";
import "react-day-picker/style.css";

const MONTH_TAB_COUNT = 12;

function parseDateString(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toInputDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatFooterDate(date: Date, locale: string) {
  const dateFnsLocale = locale === "fr" ? fr : enUS;
  return format(date, "EEE, MMM d, yyyy", { locale: dateFnsLocale });
}

function formatMonthTab(date: Date, locale: string) {
  const dateFnsLocale = locale === "fr" ? fr : enUS;
  return format(date, "MMM yyyy", { locale: dateFnsLocale });
}

export function DateRangePickerModal({
  open,
  onClose,
  checkIn,
  checkOut,
  locale,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  checkIn: string;
  checkOut: string;
  locale: string;
  onApply: (checkIn: string, checkOut: string) => void;
}) {
  const t = useTranslations("propertyBar");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const today = startOfDay(new Date());
  const dayPickerLocale = locale === "fr" ? rdpFr : rdpEn;
  const monthTabsStart = useMemo(() => startOfMonth(today), [today]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [range, setRange] = useState<DateRange | undefined>(() => ({
    from: parseDateString(checkIn),
    to: parseDateString(checkOut),
  }));
  const [displayMonth, setDisplayMonth] = useState(() =>
    startOfMonth(parseDateString(checkIn)),
  );
  const [shopByPrice, setShopByPrice] = useState(false);
  const [monthCount, setMonthCount] = useState(2);
  const [activeField, setActiveField] = useState<"checkIn" | "checkOut">("checkIn");

  const monthTabs = useMemo(
    () =>
      Array.from({ length: MONTH_TAB_COUNT }, (_, i) =>
        addMonths(monthTabsStart, i),
      ),
    [monthTabsStart],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setMonthCount(mq.matches ? 2 : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      const from = parseDateString(checkIn);
      setRange({
        from,
        to: parseDateString(checkOut),
      });
      setDisplayMonth(startOfMonth(from));
      setActiveField("checkIn");
    }
  }, [open, checkIn, checkOut]);

  function handleSelect(next: DateRange | undefined) {
    setRange(next);
    if (next?.from && !next.to) {
      setActiveField("checkOut");
    } else if (next?.from && next.to) {
      setActiveField("checkIn");
    }
  }

  function handleApply() {
    if (!range?.from) return;
    const from = startOfDay(range.from);
    const to = startOfDay(range.to ?? addDays(from, 1));
    const checkOutDate = to > from ? to : addDays(from, 1);
    onApply(toInputDate(from), toInputDate(checkOutDate));
    onClose();
  }

  if (!open || !mounted) return null;

  const checkInDisplay = range?.from
    ? formatFooterDate(range.from, locale)
    : "—";
  const checkOutDisplay = range?.to
    ? formatFooterDate(range.to, locale)
    : range?.from
      ? t("datesSelectCheckout")
      : "—";

  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        aria-label={t("datesModalClose")}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-[min(52rem,100%)] flex-col overflow-hidden rounded-xl bg-white text-neutral-900 shadow-2xl outline-none"
      >
        <header className="relative shrink-0 border-b border-neutral-200 px-4 py-4 sm:px-6 sm:py-5">
          <h2
            id={titleId}
            className="pr-10 text-center text-lg font-bold tracking-tight text-neutral-900 sm:text-xl"
          >
            {t("datesModalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("datesModalClose")}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md border border-[#104c97] text-[#104c97] transition-colors hover:bg-[#104c97]/5 sm:right-4"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </header>

        <nav
          aria-label={t("datesMonthNavAria")}
          className="flex shrink-0 gap-0 overflow-x-auto border-b border-neutral-200 px-2 scrollbar-thin"
        >
          {monthTabs.map((month) => {
            const active = isSameMonth(month, displayMonth);
            return (
              <button
                key={month.toISOString()}
                type="button"
                onClick={() => setDisplayMonth(month)}
                className={cn(
                  "shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors",
                  active
                    ? "border-b-[3px] border-[#104c97] text-neutral-900"
                    : "border-b-[3px] border-transparent text-neutral-700 hover:text-neutral-900",
                )}
              >
                {formatMonthTab(month, locale)}
              </button>
            );
          })}
        </nav>

        <div className="hilton-date-picker min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 text-neutral-900 sm:px-8 sm:py-6">
          <DayPicker
            mode="range"
            numberOfMonths={monthCount}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            locale={dayPickerLocale}
            selected={range}
            onSelect={handleSelect}
            disabled={{ before: today }}
            showOutsideDays
            hideNavigation
            fixedWeeks
            className="mx-auto w-full max-w-full"
            styles={{
              root: { margin: 0, width: "100%" },
            }}
          />
        </div>

        <footer className="shrink-0 border-t border-neutral-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-800">
              <input
                type="checkbox"
                checked={shopByPrice}
                onChange={(e) => setShopByPrice(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-400 accent-[#104c97]"
              />
              {t("shopByPrice")}
            </label>

            <div className="flex flex-wrap items-end justify-between gap-3 sm:justify-end sm:gap-6">
              <div className="flex min-w-0 flex-wrap items-end gap-2 text-sm sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    {t("checkIn")}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 truncate font-medium text-neutral-900",
                      activeField === "checkIn" && "border-b-2 border-[#104c97] pb-0.5",
                    )}
                  >
                    {checkInDisplay}
                  </p>
                </div>
                <ArrowRight
                  className="mb-1 h-4 w-4 shrink-0 text-neutral-500"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    {t("checkOut")}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 truncate font-medium text-neutral-900",
                      activeField === "checkOut" && "border-b-2 border-[#104c97] pb-0.5",
                    )}
                  >
                    {checkOutDisplay}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[5.5rem] rounded-md border border-[#104c97] bg-white px-5 py-2.5 text-sm font-semibold text-[#104c97] transition-colors hover:bg-[#104c97]/5"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!range?.from}
                  className="min-w-[5.5rem] rounded-md bg-[#104c97] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3d7a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("done")}
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export function DateRangeTrigger({
  checkInLabel,
  checkOutLabel,
  checkInAria,
  checkOutAria,
  onClick,
  isOpen,
}: {
  checkInLabel: { day: string; month: string; weekday: string };
  checkOutLabel: { day: string; month: string; weekday: string };
  checkInAria: string;
  checkOutAria: string;
  onClick: () => void;
  isOpen?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${checkInAria}, ${checkOutAria}`}
      aria-expanded={isOpen}
      className={cn(
        "group/datePicker flex w-full min-w-0 items-stretch overflow-hidden rounded-md border bg-white transition-[border-color,box-shadow]",
        isOpen
          ? "border-[#104c97] shadow-sm"
          : "border-transparent hover:border-[#104c97] hover:shadow-sm",
      )}
    >
      <DateDisplay {...checkInLabel} />
      <div
        className={cn(
          "w-px shrink-0 self-stretch transition-colors",
          isOpen ? "bg-neutral-200" : "bg-transparent group-hover/datePicker:bg-neutral-200",
        )}
        aria-hidden
      />
      <DateDisplay {...checkOutLabel} />
    </button>
  );
}

function DateDisplay({
  day,
  month,
  weekday,
}: {
  day: string;
  month: string;
  weekday: string;
}) {
  return (
    <span className="flex h-12 min-w-0 flex-1 cursor-pointer items-center px-2 sm:min-w-[5.25rem] sm:px-2.5">
      <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap sm:gap-2">
        <span className="text-2xl font-bold leading-none text-[#104c97] sm:text-4xl">
          {day}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[10px] font-bold tracking-wide text-[#104c97] sm:text-[11px]">
            {month}
          </span>
          <span className="text-[10px] font-normal text-[#104c97]/80 sm:text-[11px]">
            {weekday}
          </span>
        </span>
      </span>
    </span>
  );
}
