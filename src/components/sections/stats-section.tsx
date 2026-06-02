"use client";

import { stats } from "@/content/site";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

export function StatsSection() {
  const t = useTranslations();

  return (
    <section id="suites" className="py-8 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16">
        <div className="flex flex-col items-center justify-center gap-8 md:gap-16">
          <h2 className="max-w-4xl text-center font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("intro.title")}
          </h2>

          <div className="grid w-full grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-0">
            {stats.map((stat, index) => (
              <div
                key={stat.labelKey}
                className="relative flex flex-col items-center justify-center gap-3 px-6 py-5 sm:py-10"
              >
                {index > 0 && (
                  <div
                    className="absolute left-0 top-1/2 hidden h-40 w-px -translate-y-1/2 bg-border sm:block"
                    aria-hidden
                  />
                )}
                <div className="flex items-center gap-0 text-6xl font-medium sm:gap-2 sm:text-7xl md:text-8xl lg:text-9xl">
                  <Plus
                    className="h-6 w-6 sm:h-8 sm:w-8 lg:h-12 lg:w-12"
                    strokeWidth={3.5}
                    aria-hidden
                  />
                  <span>{stat.value}</span>
                </div>
                <p className="text-center text-base text-muted">{t(stat.labelKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
