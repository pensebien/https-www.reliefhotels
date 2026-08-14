import { StaffLoginForm } from "@/features/staff-shell/components/staff-login-form";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staffLogin" });

  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function StaffLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <StaffLoginForm />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
