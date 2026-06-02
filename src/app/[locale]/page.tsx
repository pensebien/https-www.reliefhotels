import {
  MeetingsEventsTeaser,
  SignatureExperiencesTeaser,
} from "@/features/phase-1-foundation";
import { ReviewsSection } from "@/components/sections/reviews-section";
import { ContactSection } from "@/components/sections/contact-section";
import { CtaSection } from "@/components/sections/cta-section";
import { ExperienceGrid } from "@/components/sections/experience-grid";
import { HeroSection } from "@/components/sections/hero-section";
import { HighlightsSection } from "@/components/sections/highlights-section";
import { StatsSection } from "@/components/sections/stats-section";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HeroSection />
      <StatsSection />
      <ExperienceGrid />
      <HighlightsSection />
      <MeetingsEventsTeaser />
      <SignatureExperiencesTeaser />
      <CtaSection />
      <ReviewsSection />
      <ContactSection />
    </>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
