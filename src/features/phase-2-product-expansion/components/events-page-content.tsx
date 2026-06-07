import { EventInquiryForm } from "@/features/phase-2-product-expansion/components/event-inquiry-form";
import { EventStatsBar } from "@/features/phase-2-product-expansion/components/event-stats-bar";
import { eventSpaces } from "@/features/phase-2-product-expansion/content/event-spaces";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function EventsPageContent() {
  const t = await getTranslations("phase2.events");

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-neutral-950 px-4 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
          <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">{t("pageTitle")}</h1>
          <p className="mt-4 max-w-2xl text-white/70">{t("pageDescription")}</p>
        </div>
      </section>

      <EventStatsBar />

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-16">
        <div className="grid gap-8 lg:grid-cols-3">
          {eventSpaces.map((space) => (
            <article key={space.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative h-52">
                <Image src={space.image} alt={t(space.nameKey)} fill className="object-cover" sizes="400px" />
              </div>
              <div className="p-6">
                <p className="text-xs uppercase tracking-wider text-muted">
                  {t("capacity", { count: space.capacity })} · {t(space.styleKey)}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{t(space.nameKey)}</h2>
                <p className="mt-2 text-sm text-muted">{t(space.descriptionKey)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="event-inquiry" className="scroll-mt-24 border-t border-border bg-card/30 py-16">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="font-serif text-2xl font-medium">{t("formTitle")}</h2>
          <p className="mt-2 text-muted">{t("formDescription")}</p>
          <div className="mt-8">
            <EventInquiryForm />
          </div>
        </div>
      </section>
    </div>
  );
}
