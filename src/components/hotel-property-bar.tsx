"use client";

import {
  DateRangePickerModal,
  DateRangeTrigger,
} from "@/components/date-range-picker-modal";
import {
  BookingBarButton,
  BookingModal,
  StepperRow,
} from "@/components/booking-modal";
import { site } from "@/content/site";
import { useBookingSearch } from "@/hooks/use-booking-search";
import { parseDateString } from "@/lib/booking-search";
import { Link } from "@/i18n/navigation";
import { MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

function formatDateLabel(date: Date, locale: string) {
  const localeTag = locale === "fr" ? "fr-FR" : "en-US";
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString(localeTag, { month: "short" }).toUpperCase(),
    weekday: date.toLocaleDateString(localeTag, { weekday: "short" }).toUpperCase(),
  };
}

export function HotelPropertyBar() {
  const t = useTranslations("propertyBar");
  const locale = useLocale();
  const {
    checkIn,
    checkOut,
    roomCount,
    setRoomCount,
    adults,
    setAdults,
    children,
    setChildren,
    bookHref,
    applyDates,
    applyRoomsGuests,
  } = useBookingSearch();

  const [roomsModalOpen, setRoomsModalOpen] = useState(false);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [datesModalOpen, setDatesModalOpen] = useState(false);
  const [corporateCode, setCorporateCode] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [aaaRate, setAaaRate] = useState(false);
  const [seniorRate, setSeniorRate] = useState(false);

  const checkInLabel = formatDateLabel(parseDateString(checkIn), locale);
  const checkOutLabel = formatDateLabel(parseDateString(checkOut), locale);
  const totalGuests = adults + children;

  const roomsGuestsLabel = t("roomsGuestsSummary", {
    rooms: roomCount,
    guests: totalGuests,
  });

  function applyRoomsGuestsAndClose() {
    applyRoomsGuests();
    setRoomsModalOpen(false);
  }

  function applySpecialRates() {
    setRatesModalOpen(false);
  }

  return (
    <>
      <section
        aria-label={t("ariaLabel")}
        className="sticky top-20 z-40 border-b border-neutral-200 bg-white text-neutral-900 shadow-sm"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 lg:px-8 xl:px-12">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link href="/" className="shrink-0" aria-label={`${site.name} home`}>
              <Image
                src={site.logoSrc}
                alt=""
                width={40}
                height={40}
                className="h-9 w-9 object-contain"
                priority
              />
            </Link>

            <div className="min-w-0 font-sans leading-snug">
              <p className="truncate text-sm font-semibold text-neutral-900 sm:text-base">
                {site.name}
              </p>
              <p className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-600 sm:text-sm">
                <span className="truncate">{site.address.full}</span>
                <a
                  href={site.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("location")}
                  className="inline-flex shrink-0 rounded-full p-1 text-teal transition-colors hover:bg-teal/15 hover:text-teal-dark"
                >
                  <MapPin className="h-4 w-4 fill-teal/20" strokeWidth={2} aria-hidden />
                </a>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <DateRangeTrigger
              checkInLabel={checkInLabel}
              checkOutLabel={checkOutLabel}
              checkInAria={t("checkIn")}
              checkOutAria={t("checkOut")}
              isOpen={datesModalOpen}
              onClick={() => setDatesModalOpen(true)}
            />

            <BookingBarButton onClick={() => setRoomsModalOpen(true)}>
              <span className="whitespace-nowrap">{roomsGuestsLabel}</span>
            </BookingBarButton>

            <BookingBarButton onClick={() => setRatesModalOpen(true)}>
              <span className="whitespace-nowrap">{t("specialRates")}</span>
            </BookingBarButton>

            <Link
              href={bookHref}
              className="flex h-12 min-h-12 items-center justify-center rounded-md bg-[#104c97] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0d3d7a] sm:px-5"
            >
              {t("checkRoomsRates")}
            </Link>
          </div>
        </div>
      </section>

      <DateRangePickerModal
        open={datesModalOpen}
        onClose={() => setDatesModalOpen(false)}
        checkIn={checkIn}
        checkOut={checkOut}
        locale={locale}
        onApply={(nextCheckIn, nextCheckOut) => {
          applyDates(nextCheckIn, nextCheckOut);
          setDatesModalOpen(false);
        }}
      />

      <BookingModal
        open={roomsModalOpen}
        onClose={() => setRoomsModalOpen(false)}
        title={t("roomsGuestsModalTitle")}
        footer={
          <button
            type="button"
            onClick={applyRoomsGuestsAndClose}
            className="w-full bg-[#104c97] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d3d7a]"
          >
            {t("done")}
          </button>
        }
      >
        <div className="divide-y divide-neutral-100">
          <StepperRow
            label={t("roomsLabel")}
            value={roomCount}
            min={1}
            max={4}
            onDecrement={() => setRoomCount((n) => Math.max(1, n - 1))}
            onIncrement={() => setRoomCount((n) => Math.min(4, n + 1))}
          />
          <StepperRow
            label={t("adultsLabel")}
            value={adults}
            min={1}
            max={8}
            onDecrement={() => setAdults((n) => Math.max(1, n - 1))}
            onIncrement={() => setAdults((n) => Math.min(8, n + 1))}
          />
          <StepperRow
            label={t("childrenLabel")}
            value={children}
            min={0}
            max={6}
            onDecrement={() => setChildren((n) => Math.max(0, n - 1))}
            onIncrement={() => setChildren((n) => Math.min(6, n + 1))}
          />
        </div>
        <p className="mt-4 text-xs text-neutral-500">{t("roomsGuestsHint")}</p>
      </BookingModal>

      <BookingModal
        open={ratesModalOpen}
        onClose={() => setRatesModalOpen(false)}
        title={t("specialRatesModalTitle")}
        footer={
          <button
            type="button"
            onClick={applySpecialRates}
            className="w-full bg-[#104c97] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d3d7a]"
          >
            {t("apply")}
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="corporate-code"
              className="mb-1.5 block text-sm font-medium text-neutral-800"
            >
              {t("corporateCode")}
            </label>
            <input
              id="corporate-code"
              type="text"
              value={corporateCode}
              onChange={(e) => setCorporateCode(e.target.value)}
              placeholder={t("corporateCodePlaceholder")}
              className="h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-[#104c97] focus:ring-1 focus:ring-[#104c97]"
            />
          </div>
          <div>
            <label
              htmlFor="promo-code"
              className="mb-1.5 block text-sm font-medium text-neutral-800"
            >
              {t("promoCode")}
            </label>
            <input
              id="promo-code"
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder={t("promoCodePlaceholder")}
              className="h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-[#104c97] focus:ring-1 focus:ring-[#104c97]"
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="sr-only">{t("rateOptions")}</legend>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-800">
              <input
                type="checkbox"
                checked={aaaRate}
                onChange={(e) => setAaaRate(e.target.checked)}
                className="h-4 w-4 accent-[#104c97]"
              />
              {t("aaaRate")}
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-800">
              <input
                type="checkbox"
                checked={seniorRate}
                onChange={(e) => setSeniorRate(e.target.checked)}
                className="h-4 w-4 accent-[#104c97]"
              />
              {t("seniorRate")}
            </label>
          </fieldset>
        </div>
      </BookingModal>
    </>
  );
}
