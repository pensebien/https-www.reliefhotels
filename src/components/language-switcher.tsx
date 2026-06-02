"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";

const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  pcm: "Pidgin",
  ig: "Igbo",
  yo: "Yorùbá",
};

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm text-white/80">
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value as Locale })}
        className="rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-sm text-white backdrop-blur-sm outline-none focus:border-teal-400"
        aria-label={t("label")}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc} className="bg-neutral-900 text-white">
            {localeLabels[loc]}
          </option>
        ))}
      </select>
    </label>
  );
}
