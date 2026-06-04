"use client";

import { site } from "@/content/site";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-provider";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Equal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const navKeys = [
  { href: "/#home" as const, key: "home" },
  { href: "/rooms" as const, key: "rooms" },
  { href: "/dine-wine" as const, key: "dining" },
  { href: "/events" as const, key: "eventsMeetings" },
  { href: "/gallery" as const, key: "gallery" },
] as const;

const experienceMenuKeys = [
  { href: "/experiences" as const, key: "experiences" },
  { href: "/tours" as const, key: "tours" },
] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-t-4 border-teal transition-all duration-500",
        scrolled
          ? "bg-neutral-950/95 shadow-lg backdrop-blur-md"
          : "bg-transparent",
        "h-20 flex items-center",
      )}
    >
      <nav className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 xl:px-16">
        <Link
          href="/"
          aria-label={`${site.name} home`}
          className="flex items-center gap-3 text-white"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-sm font-semibold backdrop-blur-sm sm:h-11 sm:w-11">
            RH
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-serif text-lg font-semibold tracking-[0.24em] sm:text-xl">
              {site.shortName}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.32em] text-white/70 sm:text-xs">
              {site.tagline}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => {
              setOpen(!open);
              if (open) setExperienceOpen(false);
            }}
            aria-label={t("menu")}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-2.5 text-black outline-none sm:h-12 sm:w-12 sm:p-4"
          >
            {open ? <X className="h-4 w-4" /> : <Equal className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="absolute left-0 right-0 top-full border-t border-white/10 bg-neutral-950/98 px-4 py-6 shadow-xl backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="sm:hidden">
              <LanguageSwitcher />
            </div>
            {navKeys.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-lg text-white/90 transition-colors hover:text-teal"
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setExperienceOpen(!experienceOpen)}
                aria-expanded={experienceOpen}
                className="text-lg text-white/90 transition-colors hover:text-teal"
              >
                {t("experience")}
              </button>
              {experienceOpen && (
                <div className="flex flex-col gap-3 border-l border-white/15 pl-4">
                  {experienceMenuKeys.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => {
                        setOpen(false);
                        setExperienceOpen(false);
                      }}
                      className="text-base text-white/75 transition-colors hover:text-teal"
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link
              href="/#contact"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex w-fit rounded-full bg-teal px-6 py-3 text-sm font-medium text-gray-950"
            >
              {t("book")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
