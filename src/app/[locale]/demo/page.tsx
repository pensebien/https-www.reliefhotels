import { DemoDashboard } from "@/components/demo-dashboard";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DemoDashboard />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
