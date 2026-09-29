import { ManageBookingClient } from "@/features/booking-manage/components/manage-booking-client";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "manageBooking" });

  return {
    title: t("metaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("manageBooking");

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-neutral-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
          <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
        <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
          <ManageBookingClient />
        </Suspense>
      </section>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
