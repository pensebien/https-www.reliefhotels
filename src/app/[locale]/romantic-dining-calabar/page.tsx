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
  const page = await cms.getSeoPage("romantic-dining-calabar", locale);
  if (!page) return {};
  return { title: page.title, description: page.description, keywords: page.keywords };
}

export default async function RomanticDiningPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await cms.getSeoPage("romantic-dining-calabar", locale);
  if (!page) notFound();

  return (
    <SeoLandingPage
      page={page}
      bodyTranslationKey="romantic.body"
      ctaHref="/dine-wine"
      ctaLabelKey="cta.dining"
    />
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
