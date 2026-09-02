"use client";

import { BookStayButton } from "@/components/book-stay-button";
import { media } from "@/content/site";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

export function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-end overflow-hidden bg-black text-white"
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      >
        <source src={media.heroVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/50" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-32 xl:px-16 sm:pb-16 sm:pt-40">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row lg:items-baseline">
            <h1 className="font-serif text-4xl font-bold leading-tight sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl">
              {t("title")}
            </h1>
            <BookStayButton
              aria-label={t("cta")}
              className="group inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span className="rounded-full bg-teal p-1 pl-8 transition-transform duration-200 group-hover:scale-[1.02]">
                <span className="flex rounded-full bg-white p-2 text-black transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1 lg:p-3">
                  <ArrowUpRight className="h-6 w-6" aria-hidden />
                </span>
              </span>
            </BookStayButton>
          </div>
        </div>
      </div>
    </section>
  );
}
