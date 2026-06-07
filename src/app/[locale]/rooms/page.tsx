import { HotelPropertyBar } from "@/components/hotel-property-bar";
import { RoomCategoryTabs } from "@/components/room-category-tabs";
import { RoomsCatalog } from "@/components/rooms-catalog";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

function RoomsPageFallback() {
  return (
    <div className="border-b border-border bg-card" aria-hidden>
      <div className="mx-auto h-12 max-w-7xl" />
    </div>
  );
}

export default async function RoomsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-background">
      <Suspense fallback={<RoomsPageFallback />}>
        <HotelPropertyBar />
      </Suspense>
      <Suspense fallback={<RoomsPageFallback />}>
        <RoomCategoryTabs />
      </Suspense>
      <Suspense fallback={<RoomsPageFallback />}>
        <RoomsCatalog />
      </Suspense>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
