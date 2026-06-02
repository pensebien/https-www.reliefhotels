"use client";

import { experienceCards } from "@/content/site";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function ExperienceGrid() {
  const t = useTranslations("experiences");
  const [main, dining, spa, lounge] = experienceCards;

  return (
    <section id="experiences" className="w-full py-8 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 xl:px-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ExperienceCard
            title={t(`${main.id}.title`)}
            subtitle={t(`${main.id}.subtitle`)}
            image={main.image}
            className="min-h-[420px] md:row-span-2"
            large
          />
          <div className="grid grid-rows-2 gap-6">
            <ExperienceCard
              title={t(`${dining.id}.title`)}
              subtitle={t(`${dining.id}.subtitle`)}
              image={dining.image}
              className="min-h-[200px]"
            />
            <div className="grid grid-cols-2 gap-6">
              <ExperienceCard
                title={t(`${spa.id}.title`)}
                subtitle={t(`${spa.id}.subtitle`)}
                image={spa.image}
                className="min-h-[200px]"
                small
              />
              <ExperienceCard
                title={t(`${lounge.id}.title`)}
                subtitle={t(`${lounge.id}.subtitle`)}
                image={lounge.image}
                className="min-h-[200px]"
                small
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExperienceCard({
  title,
  subtitle,
  image,
  className,
  large,
  small,
}: {
  title: string;
  subtitle: string;
  image: string;
  className?: string;
  large?: boolean;
  small?: boolean;
}) {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl ${className ?? ""}`}
    >
      <Image
        src={image}
        alt={title}
        fill
        sizes={large ? "(max-width: 768px) 100vw, 50vw" : "33vw"}
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-gray-950"
        aria-hidden
      />
      <div className="absolute bottom-0 z-10 flex flex-col gap-1 p-6 pb-8 ps-8 sm:ps-8">
        <h3
          className={`font-semibold text-white ${small ? "text-lg" : large ? "text-2xl" : "text-xl"}`}
        >
          {title}
        </h3>
        <p className={`text-white/80 ${small ? "text-sm" : "text-sm"}`}>
          {subtitle}
        </p>
      </div>
    </article>
  );
}
