import { nearbyPlaces, site } from "@/content/site";
import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function LocationTransportSection() {
  const t = await getTranslations("location");

  return (
    <section className="border-t border-border py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-16">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-serif text-3xl font-medium sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted">{t("description")}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="border-b-2 border-teal pb-3 text-sm font-semibold uppercase tracking-wide text-foreground">
              {t("whatsNearby")}
            </p>
            <ul className="mt-2 divide-y divide-border">
              {nearbyPlaces.map((place) => (
                <li
                  key={place.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <MapPin
                      className="h-4 w-4 shrink-0 text-teal"
                      aria-hidden
                    />
                    {place.name}
                  </span>
                  <span className="shrink-0 text-sm text-muted">
                    {place.distance}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border">
            <iframe
              title={t("mapTitle")}
              src={`https://www.google.com/maps?q=${encodeURIComponent(site.mapsPlaceName)}&z=16&output=embed`}
              className="h-72 w-full lg:h-full lg:min-h-[320px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              href={site.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border-t border-border bg-card px-4 py-3 text-sm font-medium text-teal-dark transition-colors hover:bg-muted/20"
            >
              {t("openInMaps")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
