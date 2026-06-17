"use client";

import { site } from "@/content/site";
import { experienceNavLinks, mainNavLinks } from "@/content/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-provider";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

export function SiteHeader() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const experienceRef = useRef<HTMLDivElement>(null);
  const experienceCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openExperienceMenu() {
    if (experienceCloseTimer.current) {
      clearTimeout(experienceCloseTimer.current);
      experienceCloseTimer.current = null;
    }
    setExperienceOpen(true);
  }

  function scheduleCloseExperienceMenu() {
    if (experienceCloseTimer.current) clearTimeout(experienceCloseTimer.current);
    experienceCloseTimer.current = setTimeout(() => {
      setExperienceOpen(false);
      experienceCloseTimer.current = null;
    }, 200);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!experienceOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (experienceRef.current?.contains(e.target as Node)) return;
      setExperienceOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [experienceOpen]);

  useEffect(() => {
    return () => {
      if (experienceCloseTimer.current) clearTimeout(experienceCloseTimer.current);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-t-4 border-teal transition-all duration-500",
        scrolled
          ? "bg-neutral-950/95 shadow-lg backdrop-blur-md"
          : "bg-neutral-950/90 backdrop-blur-sm",
      )}
    >
      <nav className="relative mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 xl:px-16">
        <Link
          href="/"
          aria-label={`${site.name} home`}
          className="flex shrink-0 items-center gap-3 text-white"
        >
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/10 p-1 backdrop-blur-sm sm:h-11 sm:w-11">
            <Image
              src={site.logoSrc}
              alt=""
              width={44}
              height={44}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="hidden flex-col leading-none sm:flex">
            <span className="font-serif text-lg font-semibold tracking-[0.24em] sm:text-xl">
              {site.shortName}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.32em] text-white/70 sm:text-xs">
              {site.tagline}
            </span>
          </div>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-visible sm:gap-2">
          <ul className="flex items-center gap-1 overflow-x-auto whitespace-nowrap sm:gap-2 lg:gap-4">
            {mainNavLinks.map((item) => (
              <li key={item.key} className="shrink-0">
                <Link
                  href={item.href}
                  className="px-2 py-2 text-xs text-white/85 transition-colors hover:text-teal sm:px-3 sm:text-sm"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
          <div
            ref={experienceRef}
            className="relative shrink-0"
            onMouseEnter={openExperienceMenu}
            onMouseLeave={scheduleCloseExperienceMenu}
          >
            <button
              type="button"
              onClick={() => setExperienceOpen((open) => !open)}
              aria-expanded={experienceOpen}
              aria-haspopup="true"
              className="inline-flex items-center gap-1 px-2 py-2 text-xs text-white/85 transition-colors hover:text-teal sm:px-3 sm:text-sm"
            >
              {t("experience")}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  experienceOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {experienceOpen && (
              <div className="absolute right-0 top-full z-[60] min-w-48 pt-2 sm:left-0 sm:right-auto">
                <div
                  role="menu"
                  className="rounded-xl border border-white/10 bg-neutral-950 py-2 shadow-xl"
                >
                  {experienceNavLinks.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setExperienceOpen(false)}
                      className="block px-4 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/5 hover:text-teal"
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <ThemeToggle />
          <Link
            href="/#contact"
            className="hidden rounded-full bg-teal px-4 py-2 text-xs font-medium text-gray-950 transition-colors hover:bg-teal-dark sm:inline-flex sm:text-sm"
          >
            {t("book")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
