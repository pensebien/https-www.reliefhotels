import { site } from "@/content/site";

export function buildHotelSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: site.name,
    telephone: site.phone,
    email: site.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Calabar",
      addressRegion: "Cross River",
      addressCountry: "NG",
    },
  };
}

export function buildWebPageSchema(title: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: site.name,
    },
  };
}
