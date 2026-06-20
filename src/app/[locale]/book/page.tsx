import { ReservationForm } from "@/features/reservations";
import { rooms } from "@/content/site";
import { Link, redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  isValidBookingDate,
  nightsBetween,
  parseBookingSearchParams,
} from "@/lib/booking-search";
import { getTranslations, setRequestLocale } from "next-intl/server";

type BookSearchParams = {
  type?: string;
  id?: string;
  room?: string;
  tour?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  rooms?: string;
};

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<BookSearchParams>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("booking");

  if (sp.type === "tour" || sp.tour) {
    redirect({ href: "/tours", locale });
  }

  const rawId = sp.id ?? sp.room ?? "signature-suite";
  const itemId = rawId === "wellness-retreat" ? "executive-spa" : rawId;

  const room = rooms.find((r) => r.id === itemId || r.slug === itemId);

  if (!room) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-muted">{t("notFound")}</p>
        <Link href="/rooms" className="mt-4 inline-block text-teal-dark underline">
          {t("browseRooms")}
        </Link>
      </div>
    );
  }

  const urlParams = new URLSearchParams();
  if (sp.checkIn) urlParams.set("checkIn", sp.checkIn);
  if (sp.checkOut) urlParams.set("checkOut", sp.checkOut);
  if (sp.guests) urlParams.set("guests", sp.guests);
  if (sp.rooms) urlParams.set("rooms", sp.rooms);

  const bookingQuery = parseBookingSearchParams(urlParams);
  const checkIn =
    bookingQuery?.checkIn ??
    (isValidBookingDate(sp.checkIn) ? sp.checkIn : undefined);
  const checkOut =
    bookingQuery?.checkOut ??
    (isValidBookingDate(sp.checkOut) ? sp.checkOut : undefined);
  const nights =
    checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 2;
  const guests =
    bookingQuery?.guests ??
    Math.min(12, Math.max(1, Number(sp.guests ?? "2") || 2));

  const tr = await getTranslations("rooms");
  const labelKey = room.nameKey.split(".")[1];
  const itemLabel = tr(`${labelKey}.name`);

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
        <ReservationForm
          itemId={room.id}
          itemLabel={itemLabel}
          checkIn={checkIn}
          checkOut={checkOut}
          nights={nights}
          guests={guests}
          priceFrom={room.priceFrom}
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
