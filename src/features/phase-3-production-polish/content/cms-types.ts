/** Content model stubs — wire to Sanity/Contentful/Strapi later */

export type CmsExperience = {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  duration?: string;
  priceFrom?: number;
  locale: string;
};

export type CmsEventSpace = {
  id: string;
  slug: string;
  name: string;
  capacity: number;
  description: string;
  imageUrl: string;
  locale: string;
};

export type CmsSeoPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  body: string;
  keywords: string[];
  locale: string;
};

export type CmsDataSource = {
  getExperiences(locale: string): Promise<CmsExperience[]>;
  getEventSpaces(locale: string): Promise<CmsEventSpace[]>;
  getSeoPage(slug: string, locale: string): Promise<CmsSeoPage | null>;
};
