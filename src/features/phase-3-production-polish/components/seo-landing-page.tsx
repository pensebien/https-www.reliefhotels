import { site } from "@/content/site";
import type { CmsSeoPage } from "@/features/phase-3-production-polish/content/cms-types";
import { buildHotelSchema, buildWebPageSchema } from "@/features/phase-3-production-polish/seo/schema";
import { Link } from "@/i18n/navigation";
import { getServerConfig } from "@/lib/config";
import { getTranslations } from "next-intl/server";

type SeoLandingPageProps = {
  page: CmsSeoPage;
  bodyTranslationKey: string;
  ctaHref: string;
  ctaLabelKey: string;
};

export async function SeoLandingPage({
  page,
  bodyTranslationKey,
  ctaHref,
  ctaLabelKey,
}: SeoLandingPageProps) {
  const t = await getTranslations("phase3.seo");
  const config = getServerConfig();
  const url = `${config.appUrl}/${page.slug}`;

  const schemas = [buildHotelSchema(), buildWebPageSchema(page.title, page.description, url)];

  return (
    <div className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      <section className="border-b border-border bg-neutral-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm uppercase tracking-[0.22em] text-teal">
            {site.name}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">{page.h1}</h1>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <p className="text-lg leading-relaxed text-muted">{t(bodyTranslationKey)}</p>
        <ul className="mt-8 flex flex-wrap gap-2">
          {page.keywords.map((kw) => (
            <li key={kw} className="rounded-full border border-border px-3 py-1 text-xs text-muted">
              {kw}
            </li>
          ))}
        </ul>
        <Link
          href={ctaHref}
          className="mt-10 inline-flex rounded-full bg-teal px-8 py-3.5 text-sm font-medium text-gray-950 hover:bg-teal-dark"
        >
          {t(ctaLabelKey)}
        </Link>
      </section>
    </div>
  );
}
