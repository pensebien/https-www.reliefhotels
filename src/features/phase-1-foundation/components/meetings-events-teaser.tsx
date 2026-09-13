"use client";

import { meetingsEventsHighlights } from "@/features/phase-1-foundation/content/meetings-events";
import { Link } from "@/i18n/navigation";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function MeetingsEventsTeaser() {
  const t = useTranslations("phase1.meetings");

  return (
    <section id="meetings-events" className="border-t border-border bg-card/40 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-dark">
              {t("eyebrow")}
            </p>
            <h2 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-4 text-muted">{t("description")}</p>
          </div>
          <Link
            href="/events"
            className="inline-flex w-fit rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-teal hover:text-gray-950"
          >
            {t("cta")}
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {meetingsEventsHighlights.map((space) => (
            <article
              key={space.id}
              className="overflow-hidden rounded-2xl border border-border bg-background"
            >
              <div className="relative h-48">
                <Image
                  src={space.image}
                  alt={t(space.titleKey)}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <Users className="h-5 w-5 text-teal" aria-hidden />
                <p className="mt-3 text-xs uppercase tracking-wider text-muted">
                  {t(space.capacityKey)}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{t(space.titleKey)}</h3>
                <p className="mt-2 text-sm text-muted">{t(space.descriptionKey)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
