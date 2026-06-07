import { DiningReservationForm } from "@/features/phase-2-product-expansion/components/dining-reservation-form";
import {
  diningVenues,
  menuHighlights,
} from "@/features/phase-2-product-expansion/content/dining-venues";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Suspense } from "react";

export async function DineWinePageContent() {
  const t = await getTranslations("phase2.dining");

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-neutral-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
          <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">{t("pageTitle")}</h1>
          <p className="mt-4 max-w-2xl text-white/70">{t("pageDescription")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-16">
        <div className="grid gap-8 md:grid-cols-3">
          {diningVenues.map((venue) => (
            <article
              key={venue.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative h-52 shrink-0">
                <Image src={venue.image} alt={t(venue.nameKey)} fill className="object-cover" sizes="400px" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs uppercase tracking-wider text-teal-dark">
                  {t(venue.cuisineKey)}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{t(venue.nameKey)}</h2>
                <p className="mt-2 flex-1 text-sm text-muted">{t(venue.descriptionKey)}</p>
                <div className="mt-6 flex justify-end">
                  <a
                    href={`?venue=${venue.id}#dining-reservation`}
                    className="btn-primary"
                  >
                    {t("book")}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="font-serif text-2xl font-medium">{t("menuTitle")}</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {menuHighlights.map((key) => (
              <li key={key} className="rounded-full border border-border px-4 py-2 text-sm">
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="dining-reservation" className="scroll-mt-24 border-t border-border py-16">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="font-serif text-2xl font-medium">{t("formTitle")}</h2>
          <p className="mt-2 text-muted">{t("formDescription")}</p>
          <div className="mt-8">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted/20" />}>
              <DiningReservationForm />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  );
}
