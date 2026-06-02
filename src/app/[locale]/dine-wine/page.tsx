import { DineWinePageContent } from "@/features/phase-2-product-expansion";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

export default async function DineWinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DineWinePageContent />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
