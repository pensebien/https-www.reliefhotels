import { DemoDashboard } from "@/components/demo-dashboard";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

function DashboardFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 text-muted" aria-hidden>
      Loading staff portal…
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staffPortal" });

  return {
    title: t("metaTitle"),
    description: t("subtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function StaffPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { locale } = await params;
  const { key } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "cashier" });

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-8 lg:px-8">
        <Link
          href={{ pathname: "/staff/cashier", query: key ? { key } : undefined }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
        >
          {t("navLink")} →
        </Link>
      </div>
      <Suspense fallback={<DashboardFallback />}>
        <DemoDashboard variant="portal" />
      </Suspense>
    </>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
