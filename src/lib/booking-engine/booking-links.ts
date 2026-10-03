/**
 * Shareable booking links (Sirvoy's extra booking engines, lite): /go/<slug>
 * opens the rooms page limited to some room types, with a promo code and/or a
 * rate plan already applied — e.g. a corporate link for one company.
 */

import { readSettingsDoc, writeSettingsDoc } from "@/lib/settings-store";
import { z } from "zod";

const KEY = "booking_links";

export const bookingLinkSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/, "Link names use lowercase letters, numbers and dashes"),
  label: z.string().trim().min(1).max(80),
  /** Empty = every room type. */
  roomIds: z.array(z.string()).max(20).default([]),
  couponCode: z.string().trim().toUpperCase().max(40).optional(),
  ratePlanId: z.string().max(60).optional(),
  active: z.boolean().default(true),
});
export type BookingLink = z.infer<typeof bookingLinkSchema>;

/** What the public site needs to apply a link. */
export type ResolvedBookingLink = Pick<BookingLink, "slug" | "label" | "roomIds" | "couponCode" | "ratePlanId">;

const docSchema = z.object({ links: z.array(bookingLinkSchema).max(50) });

export async function getBookingLinks(): Promise<BookingLink[]> {
  // Cache holds the whole document (what writeSettingsDoc stores), not the list.
  const doc = await readSettingsDoc(KEY, (raw) => {
    const parsed = docSchema.safeParse(raw);
    return parsed.success ? parsed.data : { links: [] };
  });
  return doc.links;
}

export async function saveBookingLinks(input: unknown): Promise<BookingLink[]> {
  const parsed = docSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const slugs = parsed.data.links.map((l) => l.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error("Each link needs its own name");
  return (await writeSettingsDoc(KEY, parsed.data)).links;
}

export async function resolveBookingLink(slug: string | null | undefined): Promise<ResolvedBookingLink | null> {
  if (!slug) return null;
  const link = (await getBookingLinks()).find((l) => l.slug === slug && l.active);
  if (!link) return null;
  const { label, roomIds, couponCode, ratePlanId } = link;
  return { slug, label, roomIds, couponCode: couponCode || undefined, ratePlanId: ratePlanId || undefined };
}

/** True when the link applies to this room type. */
export const linkCoversRoom = (link: Pick<BookingLink, "roomIds">, roomId: string) =>
  link.roomIds.length === 0 || link.roomIds.includes(roomId);
