"use client";

import { useEffect, useState } from "react";

export type RoomCatalogEntry = { id: string; bookableOnline: boolean; photos: string[] };

/** Staff room setup as the website sees it (photos, online on/off); empty until loaded. */
export function useRoomCatalog(): Map<string, RoomCatalogEntry> {
  const [catalog, setCatalog] = useState<Map<string, RoomCatalogEntry>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rooms/catalog")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { rooms?: RoomCatalogEntry[] } | null) => {
        if (!cancelled && data?.rooms) {
          setCatalog(new Map(data.rooms.map((r) => [r.id, r])));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}
