import confetti from "canvas-confetti";

const BRAND_COLORS = ["#2dd4bf", "#5eead4", "#c9a962", "#f5f2ed", "#14b8a6"];

/** Fire a short brand-colored burst. No-ops when the user prefers reduced motion. */
export function celebrateSuccess() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  void confetti({
    particleCount: 110,
    spread: 70,
    startVelocity: 38,
    origin: { y: 0.62 },
    colors: BRAND_COLORS,
    disableForReducedMotion: true,
  });
}
