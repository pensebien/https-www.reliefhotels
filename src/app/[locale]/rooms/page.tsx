import { HotelPropertyBar } from "@/components/hotel-property-bar";
import { RoomsCatalog } from "@/components/rooms-catalog";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

function RoomsPageFallback() {
  return <div className="h-16 border-b border-neutral-200 bg-neutral-50" aria-hidden />;
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
        <RoomsCatalog />
      </Suspense>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
