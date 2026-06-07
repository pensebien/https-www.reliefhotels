import { media } from "@/content/site";

export const signatureExperienceTeasers = [
  {
    id: "picnic",
    image: media.images.calabar,
    titleKey: "picnic.title",
    descriptionKey: "picnic.description",
    href: "/tours",
  },
  {
    id: "romantic-dining",
    image: media.images.rooftopDining,
    titleKey: "romantic.title",
    descriptionKey: "romantic.description",
    href: "/dine-wine",
  },
  {
    id: "heritage-tour",
    image: media.images.tourCulture,
    titleKey: "heritage.title",
    descriptionKey: "heritage.description",
    href: "/tours",
  },
  {
    id: "suites-stay",
    image: media.images.suitesShowcase,
    titleKey: "suites.title",
    descriptionKey: "suites.description",
    href: "/rooms?category=suites",
  },
] as const;
