import { StaffCalendarClient } from "@/features/staff-calendar/components/staff-calendar-client";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

function StaffCalendarFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 text-muted" aria-hidden>
      Loading occupancy calendar…
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staffCalendar" });

  return {
    title: t("metaTitle"),
    description: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function StaffCalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<StaffCalendarFallback />}>
      <StaffCalendarClient />
    </Suspense>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
