import { StaffInvoiceSettingsClient } from "@/features/staff-invoice-settings/components/staff-invoice-settings-client";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

function StaffInvoiceSettingsFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-muted" aria-hidden>
      Loading invoice settings…
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staffInvoiceSettings" });

  return {
    title: t("metaTitle"),
    description: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function StaffInvoiceSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<StaffInvoiceSettingsFallback />}>
      <StaffInvoiceSettingsClient />
    </Suspense>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
