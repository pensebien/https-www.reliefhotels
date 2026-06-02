import { EventsPageContent } from "@/features/phase-2-product-expansion";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <EventsPageContent />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
