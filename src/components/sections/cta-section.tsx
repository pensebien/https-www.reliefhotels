"use client";

import { media, marqueeItems } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function CtaSection() {
  const t = useTranslations("cta");
  const tm = useTranslations();

  const items = marqueeItems.map((key) => tm(key));

  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-16 sm:py-20">
        <div className="relative flex min-h-96 items-center justify-center overflow-hidden rounded-t-2xl bg-black/30">
          <video
            className="absolute inset-0 -z-10 h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            aria-label="Luxury hotel ambiance"
          >
            <source src={media.ctaVideo} type="video/mp4" />
          </video>
          <div className="h-full w-full px-6 py-16 sm:px-10">
            <div className="flex flex-col items-center gap-8">
              <h2 className="max-w-2xl text-center font-serif text-3xl font-medium text-white sm:text-4xl">
                {t("title")}
              </h2>
              <Link
                href="/#contact"
                className="rounded-full bg-white px-6 py-3.5 text-sm font-medium text-neutral-900 transition-colors duration-300 hover:bg-neutral-900 hover:text-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black"
              >
                {t("button")}
              </Link>
            </div>
          </div>
        </div>

        <div className="pause-on-hover overflow-hidden rounded-b-2xl border-t border-black/5 bg-teal py-4">
          <div className="flex animate-marquee gap-5">
            {[...items, ...items].map((text, i) => (
              <div key={`${text}-${i}`} className="flex shrink-0 items-center gap-6">
                <p className="whitespace-nowrap text-sm text-gray-950">{text}</p>
                <span className="h-px w-8 bg-gray-950" aria-hidden />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
