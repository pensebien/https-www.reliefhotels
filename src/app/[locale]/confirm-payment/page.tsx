import { ConfirmPaymentClient, type ConfirmPaymentView } from "@/features/confirm-payment/components/confirm-payment-client";
import { isValidConfirmToken } from "@/lib/booking-engine/confirm-link";
import { findReservationById } from "@/lib/demo-store";
import { roomDisplayName } from "@/lib/room-names";
import { amountDueNgn, bookingRef } from "@/lib/whatsapp-transfer";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

// Depends on live booking state and a per-link token: never prerender or cache.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "confirmPayment" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function ConfirmPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; t?: string }>;
}) {
  const { locale } = await params;
  const { id = "", t: token = "" } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("confirmPayment");

  let valid = false;
  try {
    valid = isValidConfirmToken(id, token);
  } catch {
    valid = false;
  }
  // Opening the link only ever reads the booking; confirming is the client's POST.
  const reservation = valid ? await findReservationById(id) : undefined;
  const view: ConfirmPaymentView | null =
    reservation && reservation.itemType === "room"
      ? {
          id: reservation.id,
          token,
          ref: bookingRef(reservation.id),
          guest: `${reservation.firstName} ${reservation.lastName}`,
          whatsapp: reservation.whatsappNumber ?? null,
          room: roomDisplayName(reservation.roomId),
          checkIn: reservation.checkIn ?? null,
          checkOut: reservation.checkOut ?? null,
          amountDueNgn: amountDueNgn(reservation),
          status: reservation.status,
          holdExpired: Boolean(
            reservation.status === "pending" && reservation.holdExpiresAt && new Date(reservation.holdExpiresAt) < new Date(),
          ),
          confirmedBy: reservation.paymentConfirmedBy ?? null,
          confirmedAt: reservation.paymentConfirmedAt ?? null,
        }
      : null;

  return (
    <div className="bg-background">
      <section className="border-b border-border bg-neutral-950 px-4 py-12 text-white">
        <div className="mx-auto max-w-xl">
          <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
          <h1 className="mt-2 font-serif text-3xl font-medium">{t("title")}</h1>
        </div>
      </section>
      <section className="mx-auto max-w-xl px-4 py-10">
        <ConfirmPaymentClient view={view} />
      </section>
    </div>
  );
}
