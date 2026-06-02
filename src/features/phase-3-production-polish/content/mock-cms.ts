import type {
  CmsDataSource,
  CmsEventSpace,
  CmsExperience,
  CmsSeoPage,
} from "./cms-types";

// TODO: Replace MockCmsDataSource with Sanity/Contentful adapter implementing CmsDataSource.

const seoPages: CmsSeoPage[] = [
  {
    slug: "luxury-hotel-calabar",
    title: "Luxury Hotel in Calabar | Relief Hotels & Suites",
    description:
      "Five-star hospitality in Calabar with signature suites, concierge service, and curated Cross River experiences.",
    h1: "Luxury Hotel in Calabar",
    body: "phase3.seo.luxury.body",
    keywords: ["luxury hotel calabar", "5 star hotel nigeria", "calabar suites"],
    locale: "en",
  },
  {
    slug: "conference-venue-cross-river",
    title: "Conference Venue in Cross River | Relief Hotels & Suites",
    description:
      "Host executive summits, weddings, and diplomatic events with premium venues and full concierge support.",
    h1: "Conference Venue in Cross River",
    body: "phase3.seo.conference.body",
    keywords: ["conference venue calabar", "event space cross river"],
    locale: "en",
  },
  {
    slug: "romantic-dining-calabar",
    title: "Romantic Dining in Calabar | Relief Hotels & Suites",
    description:
      "Private rooftop dining, chef-curated menus, and unforgettable evenings for couples and celebrations.",
    h1: "Romantic Dining in Calabar",
    body: "phase3.seo.romantic.body",
    keywords: ["romantic dining calabar", "private dining nigeria"],
    locale: "en",
  },
];

export class MockCmsDataSource implements CmsDataSource {
  async getExperiences(_locale: string): Promise<CmsExperience[]> {
    return [];
  }

  async getEventSpaces(_locale: string): Promise<CmsEventSpace[]> {
    return [];
  }

  async getSeoPage(slug: string, locale: string): Promise<CmsSeoPage | null> {
    return seoPages.find((p) => p.slug === slug && p.locale === locale) ?? null;
  }
}

export const cms = new MockCmsDataSource();

export const seoSlugs = [
  "luxury-hotel-calabar",
  "conference-venue-cross-river",
  "romantic-dining-calabar",
] as const;

export type SeoSlug = (typeof seoSlugs)[number];
