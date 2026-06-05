"use client";

import {
  roomCategories,
  rooms,
  roomsCatalogTabs,
  roomsPageStayIncludes,
  type RoomsCatalogTab,
} from "@/content/site";
import {
  bookingSearchToQueryString,
  nightsBetween,
  parseBookingSearchParams,
  parseDateString,
} from "@/lib/booking-search";
import type { AvailableRoom } from "@/lib/room-availability";
import { Link } from "@/i18n/navigation";
import { cn, formatNaira } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/** Keys in site data are `rooms.amenities.*` but the namespace is already `rooms`. */
function roomsMessageKey(key: string) {
  return key.startsWith("rooms.") ? key.slice("rooms.".length) : key;
}

type Room = (typeof rooms)[number];

function formatStayDate(value: string, locale: string) {
  const localeTag = locale === "fr" ? "fr-FR" : "en-US";
  return parseDateString(value).toLocaleDateString(localeTag, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RoomsCatalog() {
  const t = useTranslations("rooms");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const bookingQuery = useMemo(
    () => parseBookingSearchParams(searchParams),
    [searchParams],
  );

  const categoryParam = searchParams.get("category");
  const initialTab: RoomsCatalogTab =
    categoryParam &&
    (roomsCatalogTabs as readonly string[]).includes(categoryParam)
      ? (categoryParam as RoomsCatalogTab)
      : "all";

  const [activeTab, setActiveTab] = useState<RoomsCatalogTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [availableById, setAvailableById] = useState<Map<string, AvailableRoom>>(
    () => new Map(),
  );

  useEffect(() => {
    if (
      categoryParam &&
      (roomsCatalogTabs as readonly string[]).includes(categoryParam)
    ) {
      setActiveTab(categoryParam as RoomsCatalogTab);
    }
  }, [categoryParam]);

  useEffect(() => {
    if (!bookingQuery) {
      setAvailableById(new Map());
      setFetchError(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(false);

    const qs = bookingSearchToQueryString(bookingQuery);
    fetch(`/api/rooms/availability?${qs}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error ?? "fetch failed");
        return data as { available: AvailableRoom[] };
      })
      .then((data) => {
        if (cancelled) return;
        const map = new Map<string, AvailableRoom>();
        for (const room of data.available) map.set(room.id, room);
        setAvailableById(map);
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingQuery]);

  const catalogRooms = useMemo(() => {
    if (!bookingQuery) return [];
    const ids = availableById;
    return rooms.filter((room) => ids.has(room.id));
  }, [availableById, bookingQuery]);

  const filteredRooms = useMemo(
    () =>
      activeTab === "all"
        ? catalogRooms
        : catalogRooms.filter((room) => room.category === activeTab),
    [activeTab, catalogRooms],
  );

  const groupedRooms = useMemo(() => {
    if (activeTab !== "all" || !bookingQuery) return null;
    return roomCategories
      .map((category) => ({
        category,
        rooms: catalogRooms.filter((room) => room.category === category),
      }))
      .filter((group) => group.rooms.length > 0);
  }, [activeTab, bookingQuery, catalogRooms]);

  const currencyLocale = locale === "fr" ? "fr-FR" : "en-NG";
  const panelId = `rooms-panel-${activeTab}`;

  const dateBanner =
    bookingQuery &&
    t("availabilityForDates", {
      checkIn: formatStayDate(bookingQuery.checkIn, locale),
      checkOut: formatStayDate(bookingQuery.checkOut, locale),
      nights: nightsBetween(bookingQuery.checkIn, bookingQuery.checkOut),
    });

  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="rooms-page-container mx-auto max-w-7xl px-4 py-8 text-center lg:px-16 lg:py-10">
          <h1 className="mx-auto text-center font-serif text-4xl font-medium sm:text-5xl">
            {t("catalogTitle")}
          </h1>

          {bookingQuery && !loading && !fetchError && (
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted">{dateBanner}</p>
          )}

          <div className="mx-auto mt-8 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">
              {t("stayIncludesTitle")}
            </p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-foreground">
              {roomsPageStayIncludes.map((key) => (
                <li key={key} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
                  {t(`stayIncludes.${key}`)}
                </li>
              ))}
            </ul>
          </div>

          <div
            role="tablist"
            aria-label={t("tabsAria")}
            className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-1 border-b border-border"
          >
            {roomsCatalogTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={panelId}
                id={`rooms-tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium transition-colors sm:px-6 sm:text-base",
                  activeTab === tab
                    ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal"
                    : "text-muted hover:text-foreground",
                )}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        id={panelId}
        role="tabpanel"
        aria-labelledby={`rooms-tab-${activeTab}`}
        className="mx-auto max-w-7xl px-4 py-16 lg:px-16"
      >
        {!bookingQuery ? (
          <p className="text-center text-muted">{t("selectDatesPrompt")}</p>
        ) : loading ? (
          <p className="text-center text-muted" aria-live="polite">
            {t("availabilityLoading")}
          </p>
        ) : fetchError ? (
          <p className="text-center text-muted">{t("availabilityError")}</p>
        ) : filteredRooms.length === 0 ? (
          <p className="text-center text-muted">{t("noRoomsAvailable")}</p>
        ) : groupedRooms ? (
          <div className="space-y-14">
            {groupedRooms.map(({ category, rooms: categoryRooms }) => (
              <div key={category}>
                <h2 className="mb-8 font-serif text-2xl font-medium text-foreground sm:text-3xl">
                  {t(`tabs.${category}`)}
                </h2>
                <RoomGrid
                  rooms={categoryRooms}
                  t={t}
                  currencyLocale={currencyLocale}
                  availableById={availableById}
                  bookingQuery={bookingQuery}
                />
              </div>
            ))}
          </div>
        ) : (
          <RoomGrid
            rooms={filteredRooms}
            t={t}
            currencyLocale={currencyLocale}
            availableById={availableById}
            bookingQuery={bookingQuery}
          />
        )}
      </section>
    </>
  );
}

function RoomGrid({
  rooms: roomList,
  t,
  currencyLocale,
  availableById,
  bookingQuery,
}: {
  rooms: readonly Room[];
  t: ReturnType<typeof useTranslations<"rooms">>;
  currencyLocale: string;
  availableById: Map<string, AvailableRoom>;
  bookingQuery: NonNullable<ReturnType<typeof parseBookingSearchParams>>;
}) {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      {roomList.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          t={t}
          currencyLocale={currencyLocale}
          availability={availableById.get(room.id)}
          bookingQuery={bookingQuery}
        />
      ))}
    </div>
  );
}

function RoomCard({
  room,
  t,
  currencyLocale,
  availability,
  bookingQuery,
}: {
  room: Room;
  t: ReturnType<typeof useTranslations<"rooms">>;
  currencyLocale: string;
  availability?: AvailableRoom;
  bookingQuery: NonNullable<ReturnType<typeof parseBookingSearchParams>>;
}) {
  const key = room.nameKey.split(".")[1];
  const stayQs = bookingSearchToQueryString(bookingQuery);
  const bookHref = `/book?type=room&id=${room.slug}&${stayQs}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
      <div className="relative h-64 w-full">
        <Image
          src={room.image}
          alt={t(`${key}.name`)}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        {room.featured && (
          <span className="absolute left-4 top-4 rounded-full bg-teal px-3 py-1 text-xs font-medium text-gray-950">
            {t(`tabs.${room.category}`)}
          </span>
        )}
      </div>
      <div className="p-6 sm:p-8">
        <h3 className="font-serif text-2xl font-semibold">{t(`${key}.name`)}</h3>
        <p className="mt-2 text-muted">{t(`${key}.description`)}</p>
        <p className="mt-4 text-lg font-medium text-foreground">
          {availability ? (
            <>
              {t("totalForStay", {
                nights: availability.nights,
              })}{" "}
              <span className="text-teal-dark">
                {formatNaira(availability.totalFrom, currencyLocale)}
              </span>
            </>
          ) : (
            <>
              {t("from")}{" "}
              <span className="text-teal-dark">
                {formatNaira(room.priceFrom, currencyLocale)}
              </span>{" "}
              <span className="text-sm font-normal text-muted">{t("perNight")}</span>
            </>
          )}
        </p>
        {availability && availability.availableUnits <= 3 && (
          <p className="mt-2 text-sm font-medium text-amber-800">
            {t("limitedAvailability", { count: availability.availableUnits })}
          </p>
        )}
        <ul className="mt-4 flex flex-wrap gap-2">
          {room.amenitiesKeys.map((amenityKey) => (
            <li
              key={amenityKey}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted"
            >
              {t(roomsMessageKey(amenityKey))}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={bookHref}
            className="inline-flex rounded-full bg-teal px-6 py-3 text-sm font-medium text-gray-950 hover:bg-teal-dark"
          >
            {t("payDeposit")}
          </Link>
          <Link
            href={`/#contact?room=${room.slug}`}
            className="inline-flex rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:border-teal"
          >
            {t("bookRoom")}
          </Link>
        </div>
      </div>
    </article>
  );
}
