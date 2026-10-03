"use client";

import type { ResolvedBookingLink } from "@/lib/booking-engine/booking-links";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "relief-booking-link";

/**
 * The booking link a guest arrived with (/go/<slug> → ?link=<slug>). Kept for
 * the browser session so changing dates on the rooms page doesn't drop it.
 */
export function useBookingLink(): ResolvedBookingLink | null {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("link");
  const [link, setLink] = useState<ResolvedBookingLink | null>(null);

  useEffect(() => {
    let slug = fromUrl;
    try {
      if (slug) window.sessionStorage.setItem(STORAGE_KEY, slug);
      else slug = window.sessionStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage blocked: the link still works from the URL.
    }
    if (!slug) return;
    let cancelled = false;
    fetch(`/api/booking-links/${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { link?: ResolvedBookingLink } | null) => {
        if (cancelled) return;
        if (body?.link) setLink(body.link);
        else {
          setLink(null);
          try {
            window.sessionStorage.removeItem(STORAGE_KEY);
          } catch {}
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [fromUrl]);

  return link;
}
