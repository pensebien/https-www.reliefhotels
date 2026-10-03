import { StaffIntegrationsClient } from "@/features/staff-integrations/components/staff-integrations-client";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

function StaffIntegrationsFallback() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 text-muted" aria-hidden>
      Loading integrations…
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staffIntegrations" });

  return {
    title: t("metaTitle"),
    description: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function StaffIntegrationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<StaffIntegrationsFallback />}>
      <StaffIntegrationsClient />
    </Suspense>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
