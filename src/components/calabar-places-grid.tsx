import { calabarPlaces } from "@/content/calabar-places";
import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function CalabarPlacesGrid() {
  const t = await getTranslations("calabarPlaces");

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {calabarPlaces.map((place) => (
        <article
          key={place.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="relative h-44 shrink-0">
            <Image
              src={place.image}
              alt={t(place.nameKey)}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h3 className="font-semibold leading-snug">{t(place.nameKey)}</h3>
            <p className="mt-2 flex-1 text-sm text-muted">{t(place.descriptionKey)}</p>
            <p className="mt-3 text-xs font-medium leading-relaxed text-teal-dark">
              {t(place.highlightsKey)}
            </p>
            <a
              href={place.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-medium text-foreground transition-colors hover:text-teal"
            >
              {t("explore")}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
