import { cms } from "@/features/phase-3-production-polish";
import { SeoLandingPage } from "@/features/phase-3-production-polish/components/seo-landing-page";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await cms.getSeoPage("luxury-hotel-calabar", locale);
  if (!page) return {};
  return { title: page.title, description: page.description, keywords: page.keywords };
}

export default async function LuxuryHotelCalabarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await cms.getSeoPage("luxury-hotel-calabar", locale);
  if (!page) notFound();

  return (
    <SeoLandingPage
      page={page}
      bodyTranslationKey="luxury.body"
      ctaHref="/rooms"
      ctaLabelKey="cta.rooms"
    />
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
