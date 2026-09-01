"use client";

import { useEffect, useState } from "react";

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Ticks a countdown from `seconds` down to 0 once per second while `active`. */
export function useCountdown(active: boolean, seconds: number): number {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!active) return;
    setRemaining(seconds);
    const id = window.setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return remaining;
}
