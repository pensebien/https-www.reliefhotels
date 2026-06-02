import { tours } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { formatNaira } from "@/lib/utils";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { MapPin, UserCheck } from "lucide-react";

export default async function ToursPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tours");

  const tourKeys = ["heritage", "marina", "obudu", "culinary"] as const;

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-neutral-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-sm uppercase tracking-[0.22em] text-teal">
            Calabar · Cross River
          </p>
          <h1 className="font-serif text-4xl font-medium sm:text-5xl">
            {t("pageTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">{t("pageDescription")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-16">
        <div className="grid gap-8 lg:grid-cols-2">
          {tours.map((tour, index) => {
            const key = tourKeys[index];
            return (
              <article
                key={tour.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card sm:flex-row"
              >
                <div className="relative h-56 w-full sm:h-auto sm:w-2/5">
                  <Image
                    src={tour.image}
                    alt={t(`${key}.name`)}
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6 sm:p-8">
                  <h2 className="font-serif text-2xl font-semibold">
                    {t(`${key}.name`)}
                  </h2>
                  <p className="mt-2 flex-1 text-muted">{t(`${key}.description`)}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-teal" />
                      {t(`${key}.duration`)}
                    </span>
                    {tour.guideIncluded && (
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-teal" />
                        {t("guideIncluded")}
                      </span>
                    )}
                  </div>
                  <p className="mt-4 font-medium">
                    {t("from")}{" "}
                    <span className="text-teal-dark">
                      {formatNaira(tour.priceFrom)}
                    </span>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/book?type=tour&id=${tour.slug}`}
                      className="inline-flex rounded-full bg-teal px-6 py-2.5 text-sm font-medium text-gray-950 hover:bg-teal-dark"
                    >
                      {t("payNow")}
                    </Link>
                    <Link
                      href={`/#contact?tour=${tour.slug}`}
                      className="inline-flex rounded-full border border-border px-6 py-2.5 text-sm font-medium transition-colors hover:border-teal"
                    >
                      {t("bookTour")}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
