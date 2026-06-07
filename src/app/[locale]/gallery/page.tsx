import { GalleryGrid } from "@/components/gallery-grid";
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("gallery");

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-neutral-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-sm uppercase tracking-[0.22em] text-teal">
            Relief Hotels & Suites
          </p>
          <h1 className="font-serif text-4xl font-medium sm:text-5xl">
            {t("pageTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">{t("pageDescription")}</p>
        </div>
      </section>

      <section className="bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 lg:px-16">
          <GalleryGrid />
        </div>
      </section>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
