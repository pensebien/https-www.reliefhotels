"use client";

import {
  roomDetailHighlightFields,
  roomsPageStayIncludes,
  type RoomDetailHighlightField,
} from "@/content/site";
import type { AvailableRoom } from "@/lib/room-availability";
import { cn, formatNaira } from "@/lib/utils";
import {
  Bath,
  BedDouble,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  MapPin,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { type ComponentType, useEffect, useId, useRef, useState } from "react";

type RoomForDetail = {
  nameKey: string;
  descriptionKey: string;
  image: string;
  gallery: readonly string[];
  amenitiesKeys: readonly string[];
  priceFrom: number;
};

const highlightIcons: Record<
  RoomDetailHighlightField,
  ComponentType<{ className?: string }>
> = {
  guests: BedDouble,
  views: Eye,
  layout: LayoutGrid,
  bathroom: Bath,
  dining: UtensilsCrossed,
  location: MapPin,
};

function roomsMessageKey(key: string) {
  return key.startsWith("rooms.") ? key.slice("rooms.".length) : key;
}

function roomMessageKey(nameKey: string) {
  return nameKey.split(".")[1] ?? "guest";
}

export function RoomDetailModal({
  room,
  open,
  onClose,
  bookHref,
  availability,
  currencyLocale,
}: {
  room: RoomForDetail | null;
  open: boolean;
  onClose: () => void;
  bookHref: string;
  availability?: AvailableRoom;
  currencyLocale: string;
}) {
  const t = useTranslations("rooms");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const roomKey = room ? roomMessageKey(room.nameKey) : "guest";
  const photos = room?.gallery ?? [];

  useEffect(() => {
    if (!open) return;
    setPhotoIndex(0);
    setExpanded(false);
    setMoreOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setPhotoIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight")
        setPhotoIndex((i) => Math.min(photos.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, photos.length]);

  if (!open || !room) return null;

  const displayPrice = availability
    ? formatNaira(availability.totalFrom, currencyLocale)
    : formatNaira(room.priceFrom, currencyLocale);

  const priceLabel = availability
    ? t("detail.exploreRatesStay", { price: displayPrice })
    : t("detail.exploreRatesNightly", { price: displayPrice });

  const longDescription = t(`detail.longDescription.${roomKey}`);
  const shortDescription = t(`${roomKey}.description`);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label={t("detail.close")}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none sm:max-h-[90vh] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-6">
          <h2
            id={titleId}
            className="font-serif text-xl font-semibold text-neutral-900 sm:text-2xl"
          >
            {t(`${roomKey}.name`)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label={t("detail.close")}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            {/* Left — gallery & description */}
            <div className="border-b border-neutral-200 lg:border-b-0 lg:border-r">
              <div className="relative aspect-[4/3] w-full bg-neutral-100 sm:aspect-[16/10]">
                <Image
                  src={photos[photoIndex] ?? room.image}
                  alt={t("detail.photoAlt", {
                    name: t(`${roomKey}.name`),
                    index: photoIndex + 1,
                  })}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  priority
                />
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                      disabled={photoIndex === 0}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow-md transition hover:bg-white disabled:opacity-40"
                      aria-label={t("detail.previousPhoto")}
                    >
                      <ChevronLeft className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoIndex((i) => Math.min(photos.length - 1, i + 1))
                      }
                      disabled={photoIndex >= photos.length - 1}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow-md transition hover:bg-white disabled:opacity-40"
                      aria-label={t("detail.nextPhoto")}
                    >
                      <ChevronRight className="h-5 w-5" aria-hidden />
                    </button>
                    <span className="absolute bottom-3 right-3 rounded-md bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
                      {t("detail.imageOf", {
                        current: photoIndex + 1,
                        total: photos.length,
                      })}
                    </span>
                  </>
                )}
              </div>

              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto border-b border-neutral-100 px-4 py-3">
                  {photos.map((src, index) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setPhotoIndex(index)}
                      className={cn(
                        "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition",
                        index === photoIndex
                          ? "border-[#104c97]"
                          : "border-transparent opacity-70 hover:opacity-100",
                      )}
                      aria-label={t("detail.photoThumb", { index: index + 1 })}
                      aria-current={index === photoIndex}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3 px-5 py-5 sm:px-6">
                <p
                  className={cn(
                    "text-sm leading-relaxed text-neutral-700",
                    !expanded && "line-clamp-3",
                  )}
                >
                  {longDescription || t(`${roomKey}.description`)}
                </p>
                {longDescription && longDescription !== shortDescription && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="text-sm font-medium text-[#104c97] underline-offset-2 hover:underline"
                  >
                    {expanded ? t("detail.readLess") : t("detail.readMore")}
                  </button>
                )}
              </div>
            </div>

            {/* Right — stay includes, highlights, amenities */}
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <ul className="flex flex-wrap gap-x-4 gap-y-2 border-b border-neutral-100 pb-5 text-xs text-neutral-600">
                {roomsPageStayIncludes.map((key) => (
                  <li key={key} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-teal" aria-hidden />
                    {t(`stayIncludes.${key}`)}
                  </li>
                ))}
              </ul>

              <h3 className="mt-5 text-sm font-semibold text-neutral-900">
                {t("detail.roomHighlights")}
              </h3>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
                {roomDetailHighlightFields.map((field) => {
                  const Icon = highlightIcons[field];
                  return (
                    <div key={field}>
                      <dt className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {t(`detail.labels.${field}`)}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-neutral-900">
                        {t(`detail.${roomKey}.${field}`)}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="mt-6 flex w-full items-center justify-between border-t border-neutral-100 pt-4 text-left text-sm font-semibold text-neutral-900"
                aria-expanded={moreOpen}
              >
                {t("detail.moreDetails")}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    moreOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {moreOpen && (
                <ul className="mt-3 space-y-2 border-b border-neutral-100 pb-5">
                  {room.amenitiesKeys.map((amenityKey) => (
                    <li
                      key={amenityKey}
                      className="text-sm text-neutral-700 before:mr-2 before:text-teal before:content-['•']"
                    >
                      {t(roomsMessageKey(amenityKey))}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:px-6">
          <Link
            href={bookHref}
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-lg bg-[#104c97] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0d3d7a]"
          >
            {priceLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
