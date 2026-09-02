"use client";

import {
  BookingModal,
  StepperRow,
} from "@/components/booking-modal";
import {
  DateRangePickerModal,
  DateRangeTrigger,
} from "@/components/date-range-picker-modal";
import { useBookingSearch } from "@/hooks/use-booking-search";
import { clearBodyScrollLock } from "@/lib/body-scroll-lock";
import { parseDateString } from "@/lib/booking-search";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import {
  Suspense,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

function formatDateLabel(date: Date, locale: string) {
  const localeTag = locale === "fr" ? "fr-FR" : "en-US";
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString(localeTag, { month: "short" }).toUpperCase(),
    weekday: date
      .toLocaleDateString(localeTag, { weekday: "short" })
      .toUpperCase(),
  };
}

type BookStayButtonProps = {
  children: ReactNode;
  className?: string;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "className" | "type" | "onClick"
>;

function BookStayButtonInner({
  children,
  className,
  ...buttonProps
}: BookStayButtonProps) {
  const t = useTranslations("propertyBar");
  const tBook = useTranslations("bookStay");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const {
    checkIn,
    checkOut,
    roomCount,
    setRoomCount,
    adults,
    setAdults,
    children: childGuests,
    setChildren,
    bookHref,
    applyDates,
    applyRoomsGuests,
  } = useBookingSearch();

  const [open, setOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);

  const checkInLabel = formatDateLabel(parseDateString(checkIn), locale);
  const checkOutLabel = formatDateLabel(parseDateString(checkOut), locale);
  const roomsGuestsLabel = t("roomsGuestsSummary", {
    rooms: roomCount,
    guests: adults + childGuests,
  });

  function closeAll() {
    setOpen(false);
    setDatesOpen(false);
    setRoomsOpen(false);
  }

  // After route changes (e.g. Check Rooms & Rates), ensure page scroll works again.
  useEffect(() => {
    closeAll();
    clearBodyScrollLock();
    // Only when the path changes — not on every search-param tweak while browsing rooms.
  }, [pathname]);

  function goToRooms() {
    closeAll();
    clearBodyScrollLock();
    router.push(bookHref);
  }

  return (
    <>
      <button
        type="button"
        className={cn(className)}
        onClick={() => setOpen(true)}
        {...buttonProps}
      >
        {children}
      </button>

      <BookingModal
        open={open}
        onClose={closeAll}
        title={tBook("title")}
        panelClassName="w-full max-w-lg"
        footer={
          <button
            type="button"
            onClick={goToRooms}
            className="flex w-full items-center justify-center bg-[#104c97] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d3d7a]"
          >
            {t("checkRoomsRates")}
          </button>
        }
      >
        <p className="mb-4 text-sm text-neutral-600">{tBook("subtitle")}</p>
        <div className="space-y-3">
          <div className="overflow-hidden rounded-md border border-neutral-300">
            <DateRangeTrigger
              checkInLabel={checkInLabel}
              checkOutLabel={checkOutLabel}
              checkInAria={t("checkIn")}
              checkOutAria={t("checkOut")}
              isOpen={datesOpen}
              onClick={() => setDatesOpen(true)}
            />
          </div>
          <button
            type="button"
            onClick={() => setRoomsOpen(true)}
            className="flex h-12 w-full items-center justify-between rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-[#104c97] shadow-sm transition-colors hover:border-[#104c97]/40 hover:bg-neutral-50"
          >
            <span>{roomsGuestsLabel}</span>
          </button>
        </div>
      </BookingModal>

      <DateRangePickerModal
        open={datesOpen}
        onClose={() => setDatesOpen(false)}
        checkIn={checkIn}
        checkOut={checkOut}
        locale={locale}
        onApply={(nextCheckIn, nextCheckOut) => {
          applyDates(nextCheckIn, nextCheckOut);
          setDatesOpen(false);
        }}
      />

      <BookingModal
        open={roomsOpen}
        onClose={() => setRoomsOpen(false)}
        title={t("roomsGuestsModalTitle")}
        footer={
          <button
            type="button"
            onClick={() => {
              applyRoomsGuests();
              setRoomsOpen(false);
            }}
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
            value={childGuests}
            min={0}
            max={6}
            onDecrement={() => setChildren((n) => Math.max(0, n - 1))}
            onIncrement={() => setChildren((n) => Math.min(6, n + 1))}
          />
        </div>
        <p className="mt-4 text-xs text-neutral-500">{t("roomsGuestsHint")}</p>
      </BookingModal>
    </>
  );
}

/** Opens the guest booking modal (dates + rooms/guests → rooms catalog). */
export function BookStayButton(props: BookStayButtonProps) {
  return (
    <Suspense
      fallback={
        <button type="button" className={cn(props.className)} disabled>
          {props.children}
        </button>
      }
    >
      <BookStayButtonInner {...props} />
    </Suspense>
  );
}
