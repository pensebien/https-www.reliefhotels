"use client";

import {
  bookingSearchToQueryString,
  defaultCheckInDate,
  defaultCheckOutDate,
  parseBookingSearchParams,
  toDateString,
  type BookingSearchQuery,
} from "@/lib/booking-search";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useBookingSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fromUrl = useMemo(
    () => parseBookingSearchParams(searchParams),
    [searchParams],
  );

  const [checkIn, setCheckIn] = useState(
    () => fromUrl?.checkIn ?? toDateString(defaultCheckInDate()),
  );
  const [checkOut, setCheckOut] = useState(
    () => fromUrl?.checkOut ?? toDateString(defaultCheckOutDate()),
  );
  const [roomCount, setRoomCount] = useState(() => fromUrl?.rooms ?? 1);
  const [adults, setAdults] = useState(() => fromUrl?.guests ?? 1);
  const [children, setChildren] = useState(0);

  useEffect(() => {
    if (!fromUrl) return;
    setCheckIn(fromUrl.checkIn);
    setCheckOut(fromUrl.checkOut);
    setRoomCount(fromUrl.rooms);
    setAdults(fromUrl.guests);
    setChildren(0);
  }, [fromUrl]);

  const syncToUrl = useCallback(
    (query: BookingSearchQuery) => {
      if (!pathname.includes("/rooms")) return;
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("checkIn", query.checkIn);
      sp.set("checkOut", query.checkOut);
      sp.set("rooms", String(query.rooms));
      sp.set("guests", String(query.guests));
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Bar shows default dates before URL has them — seed /rooms so availability loads
  useEffect(() => {
    if (!pathname.includes("/rooms") || fromUrl) return;
    syncToUrl({
      checkIn,
      checkOut,
      rooms: roomCount,
      guests: adults + children,
    });
  }, [
    pathname,
    fromUrl,
    checkIn,
    checkOut,
    roomCount,
    adults,
    children,
    syncToUrl,
  ]);

  const applyDates = useCallback(
    (nextCheckIn: string, nextCheckOut: string) => {
      setCheckIn(nextCheckIn);
      setCheckOut(nextCheckOut);
      syncToUrl({
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
        rooms: roomCount,
        guests: adults + children,
      });
    },
    [adults, children, roomCount, syncToUrl],
  );

  const applyRoomsGuests = useCallback(() => {
    syncToUrl({
      checkIn,
      checkOut,
      rooms: roomCount,
      guests: adults + children,
    });
  }, [adults, checkIn, checkOut, children, roomCount, syncToUrl]);

  const query: BookingSearchQuery = useMemo(
    () => ({
      checkIn,
      checkOut,
      rooms: roomCount,
      guests: adults + children,
    }),
    [adults, checkIn, checkOut, children, roomCount],
  );

  const bookHref = `/rooms?${bookingSearchToQueryString(query)}`;

  const hasValidDates = useMemo(() => {
    return parseBookingSearchParams(
      new URLSearchParams(bookingSearchToQueryString(query)),
    );
  }, [query]);

  return {
    checkIn,
    checkOut,
    roomCount,
    setRoomCount,
    adults,
    setAdults,
    children,
    setChildren,
    query,
    bookHref,
    hasValidDates,
    applyDates,
    applyRoomsGuests,
    fromUrl,
  };
}
