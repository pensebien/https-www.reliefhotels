import { cityExperiences, roomHighlights } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function ExperiencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("experiencesPage");
  const tr = await getTranslations("roomTypes");
  const tc = await getTranslations("city");

  const cityKeys = ["carnival", "river", "executive"] as const;

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-neutral-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-serif text-4xl font-medium sm:text-5xl">
            {t("pageTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">{t("pageDescription")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-16">
        <h2 className="mb-8 font-serif text-2xl font-medium">{t("roomsSection")}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {roomHighlights.map((room) => (
            <div
              key={room.id}
              className="rounded-2xl border border-border bg-card p-8"
            >
              <h3 className="text-xl font-semibold text-teal-dark">
                {tr(`${room.id}.title`)}
              </h3>
              <p className="mt-3 text-muted">{tr(`${room.id}.description`)}</p>
            </div>
          ))}
        </div>

        <h2 className="mb-8 mt-16 font-serif text-2xl font-medium">
          Calabar & Cross River
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {cityExperiences.map((exp, i) => (
            <div
              key={exp.id}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h3 className="font-semibold">{tc(`${cityKeys[i]}.name`)}</h3>
              <p className="mt-2 text-sm text-muted">
                {tc(`${cityKeys[i]}.description`)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/#contact"
            className="inline-flex rounded-full bg-teal px-8 py-3.5 text-sm font-medium text-gray-950 hover:bg-teal-dark"
          >
            {t("contactCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
