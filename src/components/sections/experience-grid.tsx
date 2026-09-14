"use client";

import { experienceCards } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function ExperienceGrid() {
  const tRoom = useTranslations("roomTypes");
  const [guestRoom, executive, suites, penthouse] = experienceCards;

  return (
    <section id="rooms" className="w-full py-8 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 xl:px-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ExperienceCard
            href={guestRoom.href}
            title={tRoom(`${guestRoom.id}.title`)}
            image={guestRoom.image}
            className="min-h-[420px] md:row-span-2"
            large
          />
          <div className="grid grid-rows-2 gap-6">
            <ExperienceCard
              href={executive.href}
              title={tRoom(`${executive.id}.title`)}
              image={executive.image}
              className="min-h-[200px]"
            />
            <div className="grid grid-cols-2 gap-6">
              <ExperienceCard
                href={suites.href}
                title={tRoom(`${suites.id}.title`)}
                image={suites.image}
                className="min-h-[200px]"
              />
              <ExperienceCard
                href={penthouse.href}
                title={tRoom(`${penthouse.id}.title`)}
                image={penthouse.image}
                className="min-h-[200px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExperienceCard({
  href,
  title,
  image,
  className,
  large,
}: {
  href: (typeof experienceCards)[number]["href"];
  title: string;
  image: string;
  className?: string;
  large?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden rounded-2xl ${className ?? ""}`}
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
        <h3 className={`font-semibold text-white ${large ? "text-2xl" : "text-xl"}`}>
          {title}
        </h3>
      </div>
    </Link>
  );
}
