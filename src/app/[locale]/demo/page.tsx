import { DemoDashboard } from "@/components/demo-dashboard";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

function DashboardFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 text-muted" aria-hidden>
      Loading dashboard…
    </div>
  );
}

export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<DashboardFallback />}>
      <DemoDashboard />
    </Suspense>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
