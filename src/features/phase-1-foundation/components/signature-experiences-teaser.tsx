"use client";

import { signatureExperienceTeasers } from "@/features/phase-1-foundation/content/signature-experiences";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function SignatureExperiencesTeaser() {
  const t = useTranslations("phase1.experiences");

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-16">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-dark">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted">{t("description")}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {signatureExperienceTeasers.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative h-48">
                <Image
                  src={item.image}
                  alt={t(item.titleKey)}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="300px"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold group-hover:text-teal-dark">
                  {t(item.titleKey)}
                </h3>
                <p className="mt-1 text-sm text-muted">{t(item.descriptionKey)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
