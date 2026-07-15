"use client";

import { site } from "@/content/site";
import {
  experienceNavLinks,
  mainNavLinks,
  roomCategoryLinks,
} from "@/content/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ChevronDown, Mail, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";

function FooterCollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-white/50 transition-colors hover:text-white/70"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div id={panelId} className="mt-2 grid gap-2 pb-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function SiteFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tRoomTypes = useTranslations("roomTypes");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-neutral-950 text-white dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14 lg:px-8 xl:px-16">
        <div className="grid gap-10 border-t border-white/10 pt-10 md:grid-cols-[1.3fr_0.8fr_1fr]">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-teal" />
              <p className="text-sm uppercase tracking-[0.22em] text-white/60">
                {t("brand")}
              </p>
            </div>
            <h2 className="max-w-md font-serif text-3xl font-medium sm:text-4xl">
              {t("title")}
            </h2>
            <p className="max-w-xl text-sm leading-7 text-white/70 sm:text-base">
              {t("description")}
            </p>
            <Link
              href="/#contact"
              className="group inline-flex items-center gap-3 rounded-full bg-teal p-1 ps-5 text-sm font-medium text-gray-950 transition-colors hover:bg-teal-dark"
            >
              {t("book")}
              <span className="rounded-full bg-black p-2 text-white transition-transform duration-300 group-hover:rotate-45">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.22em] text-white/60">
                {t("explore")}
              </p>
              <div className="grid gap-3">
                {mainNavLinks.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="text-white/80 hover:text-teal"
                  >
                    {tNav(item.key)}
                  </Link>
                ))}

                <FooterCollapsibleSection title={tNav("experience")}>
                  {experienceNavLinks.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="text-sm text-white/80 hover:text-teal"
                    >
                      {tNav(item.key)}
                    </Link>
                  ))}
                </FooterCollapsibleSection>

                <FooterCollapsibleSection title={t("roomsList")}>
                  {roomCategoryLinks.map(({ category, href }) => (
                    <Link
                      key={category}
                      href={href}
                      className="text-sm text-white/80 hover:text-teal"
                    >
                      {tRoomTypes(`${category}.title`)}
                    </Link>
                  ))}
                </FooterCollapsibleSection>

                <Link
                  href="/#contact"
                  className="border-t border-white/10 pt-3 text-white/80 hover:text-teal"
                >
                  {t("contactLink")}
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.22em] text-white/60">
              {t("contact")}
            </p>
            <div className="space-y-4 text-sm text-white/80">
              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-4 w-4 text-teal" />
                <a href={site.phoneHref} className="hover:text-teal">
                  {site.phone}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-4 w-4 text-teal" />
                <a href={`mailto:${site.email}`} className="hover:text-teal">
                  {site.email}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-4 w-4 text-teal" />
                <p>{site.location}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <p>
            © {year} {site.name}. {t("rights")}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Link href="/privacy" className="hover:text-teal">
              {t("privacy")}
            </Link>
            <p>{t("tagline")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
