import { ConciergeContactPrompt } from "@/components/concierge-contact-prompt";
import { ReservationForm } from "@/features/reservations";
import { rooms } from "@/content/site";
import { getRateConfig } from "@/lib/booking-engine/rate-config";
import { getRoomAvailability } from "@/lib/room-availability";
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

  const itemId = sp.id ?? sp.room ?? "signature-suite";

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

  if (!checkIn || !checkOut) {
    const roomsParams = new URLSearchParams();
    roomsParams.set("room", room.id);
    if (sp.checkIn) roomsParams.set("checkIn", sp.checkIn);
    if (sp.checkOut) roomsParams.set("checkOut", sp.checkOut);
    if (sp.guests) roomsParams.set("guests", sp.guests);
    if (sp.rooms) roomsParams.set("rooms", sp.rooms);
    const qs = roomsParams.toString();
    redirect({
      href: qs ? `/rooms?${qs}` : "/rooms",
      locale,
    });
  }

  const stayCheckIn = checkIn as string;
  const stayCheckOut = checkOut as string;
  const nights = nightsBetween(stayCheckIn, stayCheckOut);
  const guests =
    bookingQuery?.guests ??
    Math.min(12, Math.max(1, Number(sp.guests ?? "2") || 2));

  const stayRooms = bookingQuery?.rooms ?? 1;
  const rateConfig = await getRateConfig();
  const policy = rateConfig.rooms.find((r) => r.roomId === room.id);
  const extras = rateConfig.extras
    .filter((e) => e.active !== false && (!e.roomIds || e.roomIds.includes(room.id)))
    .map(({ id, label, priceNgn, pricing }) => ({ id, label, priceNgn, pricing }));

  const tr = await getTranslations("rooms");

  // Other room types still free for these dates, for "Add another room type".
  const availability = await getRoomAvailability({
    checkIn: stayCheckIn,
    checkOut: stayCheckOut,
    rooms: 1,
    guests: 1,
  }).catch(() => null);
  const addableRooms = (availability?.available ?? [])
    .filter((a) => a.id !== room.id)
    .map((a) => {
      const other = rooms.find((r) => r.id === a.id)!;
      return {
        id: a.id,
        label: tr(`${other.nameKey.split(".")[1]}.name`),
        priceFrom: a.priceFrom,
        availableUnits: a.availableUnits,
        maxGuestsPerUnit:
          rateConfig.rooms.find((r) => r.roomId === a.id)?.maxGuestsPerUnit ?? 2,
      };
    });
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
          checkIn={stayCheckIn}
          checkOut={stayCheckOut}
          nights={nights}
          guests={guests}
          rooms={stayRooms}
          maxGuestsPerUnit={policy?.maxGuestsPerUnit}
          extras={extras}
          addableRooms={addableRooms}
          priceFrom={room.priceFrom}
        />
        <ConciergeContactPrompt />
      </section>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
