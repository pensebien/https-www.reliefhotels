import { tours } from "@/content/site";

/** Informational Calabar experiences guests may note when booking a room (not charged). */
export const experienceOptions = tours.map((tour, index) => ({
  id: tour.id,
  slug: tour.slug,
  nameKey: tour.nameKey,
  /** Matches tours page translation keys: heritage, marina, obudu, culinary */
  labelKey: (["heritage", "marina", "obudu", "culinary"] as const)[index] ?? "heritage",
}));
