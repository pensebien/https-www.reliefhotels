"use client";

import { useSearchParams } from "next/navigation";
import { RayzaPanel } from "./rayza-panel";

/** Manager page: link room types to RAYZA and watch the booking sync. */
export function RayzaPage() {
  const key = useSearchParams().get("key");
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <RayzaPanel q={key ? `?key=${encodeURIComponent(key)}` : ""} />
    </div>
  );
}
