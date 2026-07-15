import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  const sections = [
    { title: t("sections.collect.title"), body: t("sections.collect.body") },
    { title: t("sections.use.title"), body: t("sections.use.body") },
    { title: t("sections.share.title"), body: t("sections.share.body") },
    { title: t("sections.retention.title"), body: t("sections.retention.body") },
    { title: t("sections.rights.title"), body: t("sections.rights.body") },
    { title: t("sections.contact.title"), body: t("sections.contact.body") },
  ];

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-neutral-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-sm uppercase tracking-[0.22em] text-teal">
            Relief Hotels & Suites
          </p>
          <h1 className="font-serif text-4xl font-medium">{t("pageTitle")}</h1>
          <p className="mt-4 text-white/70">{t("pageDescription")}</p>
          <p className="mt-2 text-sm text-white/50">{t("lastUpdated")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-serif text-2xl font-medium">{section.title}</h2>
              <p className="mt-3 text-base leading-7 text-muted whitespace-pre-line">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
