import { BookingForm } from "@/components/booking-form";
import { rooms, tours } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; id?: string; room?: string; tour?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("booking");

  const itemType = (sp.type === "tour" ? "tour" : "room") as "room" | "tour";
  const rawId = sp.id ?? sp.room ?? sp.tour ?? "signature-suite";
  const itemId = rawId === "wellness-retreat" ? "executive-spa" : rawId;

  const room = rooms.find((r) => r.id === itemId || r.slug === itemId);
  const tour = tours.find((tr) => tr.id === itemId || tr.slug === itemId);
  const item = itemType === "room" ? room : tour;

  if (!item) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-muted">{t("notFound")}</p>
        <Link href="/rooms" className="mt-4 inline-block text-teal-dark underline">
          {t("browseRooms")}
        </Link>
      </div>
    );
  }

  const tr = await getTranslations(itemType === "room" ? "rooms" : "tours");
  const tourKeys = ["heritage", "marina", "obudu", "culinary"] as const;
  const tourIndex = tours.findIndex((x) => x.id === item.id);
  const labelKey =
    itemType === "room"
      ? item.nameKey.split(".")[1]
      : tourKeys[tourIndex >= 0 ? tourIndex : 0];
  const itemLabel =
    itemType === "room"
      ? tr(`${labelKey}.name`)
      : tr(`${labelKey}.name`);

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-neutral-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm uppercase tracking-[0.22em] text-teal">
            {t("secureCheckout")}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">
            {t("pageTitle")}
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
        <BookingForm
          itemType={itemType}
          itemId={item.id}
          itemLabel={itemLabel}
        />
        <p className="mt-8 text-center text-sm text-muted">
          <Link href="/#contact" className="text-teal-dark hover:underline">
            {t("preferConcierge")}
          </Link>
        </p>
      </section>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
