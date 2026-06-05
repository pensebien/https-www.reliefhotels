"use client";

import { roomHighlights } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

export function HighlightsSection() {
  const t = useTranslations("highlights");
  const ts = useTranslations("roomTypes");
  const [active, setActive] = useState(0);
  const service = roomHighlights[active];

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-16 md:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-8 sm:gap-16">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div className="flex max-w-2xl flex-col gap-4">
              <span className="w-fit rounded-full border border-border px-3 py-1 text-sm text-muted outline outline-border">
                {t("badge")}
              </span>
              <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-5xl">
                {t("title")}
              </h2>
              <p className="text-base text-muted sm:text-lg">{t("description")}</p>
            </div>
            <Link
              href="/rooms"
              className="group inline-flex h-auto w-fit items-center justify-between gap-2 rounded-full bg-neutral-900 p-1 ps-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-teal dark:text-gray-950"
            >
              <span className="flex items-center gap-3 px-1 py-2">
                {t("cta")}
                <span className="rounded-full bg-background p-2 text-foreground transition-transform duration-300 group-hover:rotate-45 dark:bg-black dark:text-white">
                  →
                </span>
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 flex items-center justify-center lg:col-span-4">
              <div className="relative h-80 w-full overflow-hidden rounded-2xl transition-all duration-300">
                <Image
                  src={service.image}
                  alt={ts(`${service.id}.title`)}
                  fill
                  className="object-cover"
                  sizes="400px"
                />
              </div>
            </div>
            <div className="hidden lg:col-span-1 lg:block" />
            <div className="col-span-12 flex flex-col lg:col-span-7">
              {roomHighlights.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(index)}
                  className="group flex w-full cursor-pointer flex-col items-start justify-between gap-1 border-t border-border py-6 text-left xl:flex-row xl:items-center xl:gap-10 xl:py-10"
                >
                  <h3
                    className={cn(
                      "max-w-xs py-1 text-2xl font-semibold transition-colors md:text-3xl",
                      active === index
                        ? "text-teal"
                        : "text-foreground group-hover:text-teal",
                    )}
                  >
                    {ts(`${item.id}.title`)}
                  </h3>
                  {active === index && (
                    <p className="flex-1 text-base text-muted transition-all duration-300">
                      {ts(`${item.id}.description`)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
