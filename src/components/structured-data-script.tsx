import Script from "next/script";

export function StructuredDataScript({ data }: { data: unknown }) {
  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
