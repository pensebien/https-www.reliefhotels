"use client";

import { InventoryCalendarView } from "@/components/staff/inventory-calendar-view";
import type { StaffRoomOption } from "@/components/staff/staff-create-reservation-dialog";
import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { useStaffCalendarActivity } from "@/features/staff-calendar/hooks/use-staff-calendar-activity";
import { rooms } from "@/content/site";
import { eventSpaces } from "@/features/phase-2-product-expansion/content/event-spaces";
import { Link } from "@/i18n/navigation";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";

export function StaffCalendarClient() {
  const t = useTranslations("staffCalendar");
  const tRooms = useTranslations("rooms");
  const tEvents = useTranslations("phase2.events.spaces");
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("key");

  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    const resolved =
      keyFromUrl ??
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem(SESSION_STORAGE_KEY)
        : null) ??
      DEFAULT_KEY;
    setKey(resolved);
  }, [keyFromUrl]);

  const {
    loading,
    error,
    loadedOnce,
    reservations,
    eventInquiries,
    paymentsByReservation,
    moniepoint,
    refresh,
  } = useStaffCalendarActivity(key);

  const hasData = loadedOnce && !error;

  function handleKeySubmit(nextKey: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextKey);
    }
    setKey(nextKey);
  }

  const roomOptions = useMemo<StaffRoomOption[]>(
    () =>
      rooms.map((room) => {
        const path = room.nameKey.replace(/^rooms\./, "");
        return {
          id: room.id,
          label: tRooms(path as "guest.name"),
          priceFrom: room.priceFrom,
        };
      }),
    [tRooms],
  );

  const unitLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const room of rooms) {
      const path = room.nameKey.replace(/^rooms\./, "");
      labels[room.nameKey] = tRooms(path as "guest.name");
    }
    for (const space of eventSpaces) {
      const path = space.nameKey.replace(/^spaces\./, "");
      labels[space.nameKey] = tEvents(path as "ballroom.name");
    }
    return labels;
  }, [tEvents, tRooms]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <Link
        href={{ pathname: "/staff", query: key ? { key } : undefined }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition-colors duration-200 hover:text-teal"
      >
        {t("backToPortal")}
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-teal">
            {t("eyebrow")}
          </p>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted">{t("subtitle")}</p>
        </div>
        {hasData ? (
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
            {t("refresh")}
          </button>
        ) : null}
      </div>

      {key !== null && (
        <StaffCalendarKeyForm
          key={key}
          initialKey={key}
          loading={loading}
          onSubmit={handleKeySubmit}
          placeholder={t("keyPlaceholder")}
          submitLabel={t("unlock")}
        />
      )}

      {error && <p className="mb-6 text-sm text-red-600">{error}</p>}

      {loading && !loadedOnce ? (
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {t("loading")}
        </p>
      ) : null}

      {hasData ? (
        <InventoryCalendarView
          reservations={reservations}
          eventInquiries={eventInquiries}
          paymentsByReservation={paymentsByReservation}
          unitLabels={unitLabels}
          dashboardKey={key ?? undefined}
          roomOptions={roomOptions}
          moniepointConfig={moniepoint}
          onActivityChange={refresh}
        />
      ) : null}
    </div>
  );
}
