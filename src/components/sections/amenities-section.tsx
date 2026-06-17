"use client";

import { hotelAmenities } from "@/content/site";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export function AmenitiesSection() {
  const t = useTranslations("amenities");

  return (
    <section id="amenities" className="border-t border-border bg-card/30 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-16">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-dark">
            {t("title")}
          </p>
          <h2 className="mt-2 whitespace-nowrap font-serif text-3xl font-medium sm:text-4xl">
            {t("subtitle")}
          </h2>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {hotelAmenities.map((key) => (
            <li
              key={key}
              className="inline-flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-teal" aria-hidden />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
