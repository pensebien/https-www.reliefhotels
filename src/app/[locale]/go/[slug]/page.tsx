import { redirect } from "@/i18n/navigation";

/** Short shareable booking link: /go/<slug> → rooms page with the link applied. */
export default async function BookingLinkPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  redirect({ href: `/rooms?link=${encodeURIComponent(slug)}`, locale });
}
