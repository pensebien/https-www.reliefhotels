import { HotelPropertyBar } from "@/components/hotel-property-bar";
import { RoomCategoryTabs } from "@/components/room-category-tabs";
import {
  MeetingsEventsTeaser,
  SignatureExperiencesTeaser,
} from "@/features/phase-1-foundation";
import { AmenitiesSection } from "@/components/sections/amenities-section";
import { ReviewsSection } from "@/components/sections/reviews-section";
import { ContactSection } from "@/components/sections/contact-section";
import { ExperienceGrid } from "@/components/sections/experience-grid";
import { HeroSection } from "@/components/sections/hero-section";
import { HighlightsSection } from "@/components/sections/highlights-section";
import { StatsSection } from "@/components/sections/stats-section";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

function PropertyBarFallback() {
  return (
    <div className="border-b border-border bg-card" aria-hidden>
      <div className="mx-auto h-12 max-w-7xl" />
    </div>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Suspense fallback={<PropertyBarFallback />}>
        <HotelPropertyBar />
      </Suspense>
      <Suspense fallback={<PropertyBarFallback />}>
        <RoomCategoryTabs />
      </Suspense>
      <HeroSection />
      <StatsSection />
      <ExperienceGrid />
      <AmenitiesSection />
      <HighlightsSection />
      <MeetingsEventsTeaser />
      <SignatureExperiencesTeaser />
      <ReviewsSection />
      <ContactSection />
    </>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
