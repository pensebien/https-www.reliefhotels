"use client";

import {
  galleryCategories,
  galleryItems,
  type GalleryCategory,
} from "@/content/gallery";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/safe-image";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export function GalleryGrid() {
  const t = useTranslations("gallery");
  const [filter, setFilter] = useState<GalleryCategory | "all">("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? galleryItems
      : galleryItems.filter((item) => item.category === filter);

  const activeItem = galleryItems.find((i) => i.id === lightbox);

  const close = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <>
      <nav
        role="tablist"
        aria-label={t("tabsAria")}
        className="border-b border-white/20 pt-4"
      >
        <div className="-mb-px flex gap-8 overflow-x-auto pb-px sm:gap-10 lg:gap-12">
          <GalleryTab
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={t("filterAll")}
          />
          {galleryCategories.map((cat) => (
            <GalleryTab
              key={cat}
              active={filter === cat}
              onClick={() => setFilter(cat)}
              label={t(`categories.${cat}`)}
            />
          ))}
        </div>
      </nav>

      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-background py-16">
        <div className="mx-auto max-w-7xl columns-1 gap-4 px-4 sm:columns-2 lg:columns-3 lg:px-16">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setLightbox(item.id)}
            className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <SafeImage
              src={item.src}
              alt={t(item.titleKey)}
              width={700}
              height={item.featured ? 900 : 500}
              className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <p className="absolute bottom-0 left-0 right-0 p-4 text-left text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {t(item.titleKey)}
            </p>
          </button>
        ))}
        </div>
      </div>

      {activeItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label={t("close")}
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="relative max-h-[90vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SafeImage
              src={activeItem.src}
              alt={t(activeItem.titleKey)}
              width={1400}
              height={900}
              className="max-h-[85vh] w-auto rounded-lg object-contain"
            />
            <p className="mt-4 text-center text-white">{t(activeItem.titleKey)}</p>
          </div>
        </div>
      )}
    </>
  );
}

function GalleryTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative shrink-0 whitespace-nowrap pb-4 text-base font-medium transition-colors sm:pb-5 sm:text-lg",
        active
          ? "font-bold text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:rounded-full after:bg-white sm:after:h-1.5"
          : "text-white/50 hover:text-white/80",
      )}
    >
      {label}
    </button>
  );
}
