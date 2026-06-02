import { rooms } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { formatNaira } from "@/lib/utils";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

export default async function RoomsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rooms");

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

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-16">
        <div className="grid gap-10 md:grid-cols-2">
          {rooms.map((room) => {
            const key = room.nameKey.split(".")[1];
            return (
              <article
                key={room.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="relative h-64 w-full">
                  <Image
                    src={room.image}
                    alt={t(`${key}.name`)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  {room.featured && (
                    <span className="absolute left-4 top-4 rounded-full bg-teal px-3 py-1 text-xs font-medium text-gray-950">
                      Signature
                    </span>
                  )}
                </div>
                <div className="p-6 sm:p-8">
                  <h2 className="font-serif text-2xl font-semibold">
                    {t(`${key}.name`)}
                  </h2>
                  <p className="mt-2 text-muted">{t(`${key}.description`)}</p>
                  <p className="mt-4 text-lg font-medium text-foreground">
                    {t("from")}{" "}
                    <span className="text-teal-dark">
                      {formatNaira(room.priceFrom, locale === "fr" ? "fr-FR" : "en-NG")}
                    </span>{" "}
                    <span className="text-sm font-normal text-muted">
                      {t("perNight")}
                    </span>
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {room.amenitiesKeys.map((key) => (
                      <li
                        key={key}
                        className="rounded-full border border-border px-3 py-1 text-xs text-muted"
                      >
                        {t(key)}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/book?type=room&id=${room.slug}`}
                      className="inline-flex rounded-full bg-teal px-6 py-3 text-sm font-medium text-gray-950 hover:bg-teal-dark"
                    >
                      {t("payDeposit")}
                    </Link>
                    <Link
                      href={`/#contact?room=${room.slug}`}
                      className="inline-flex rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:border-teal"
                    >
                      {t("bookRoom")}
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
