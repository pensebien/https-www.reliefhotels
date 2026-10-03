/**
 * Scheduled guest messages (Sirvoy "Communications" parity): email, SMS or
 * WhatsApp templates sent N days before/after check-in, check-out or the
 * booking date. Edited at /staff/settings/messages; stored via settings-store.
 * The two defaults ship switched off — nothing reaches guests until a
 * manager turns a template on.
 */

import { readSettingsDoc, writeSettingsDoc } from "@/lib/settings-store";
import { z } from "zod";

export const messageTemplateSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,60}$/),
    name: z.string().trim().min(1).max(80),
    channel: z.enum(["email", "sms", "whatsapp"]),
    base: z.enum(["check_in", "check_out", "booking"]),
    timing: z.enum(["before", "after"]),
    days: z.number().int().min(0).max(60),
    subject: z.string().trim().max(150),
    body: z.string().trim().min(1).max(4000),
    active: z.boolean(),
  })
  .refine((t) => t.channel !== "email" || t.subject.length > 0, {
    message: "Email templates need a subject",
  })
  .refine((t) => !(t.base === "booking" && t.timing === "before"), {
    message: "Messages based on the booking date can only go after it",
  });

export const guestMessagesSchema = z.object({
  templates: z.array(messageTemplateSchema).max(30),
});

export type MessageTemplate = z.infer<typeof messageTemplateSchema>;
export type GuestMessagesSettings = z.infer<typeof guestMessagesSchema>;

export const DEFAULT_GUEST_MESSAGES: GuestMessagesSettings = {
  templates: [
    {
      id: "pre-arrival",
      name: "Before arrival",
      channel: "email",
      base: "check_in",
      timing: "before",
      days: 2,
      subject: "Your stay at {hotelName} is coming up",
      body: "Hi {firstName},\n\nWe look forward to welcoming you on {checkIn} for {nights} night(s) in our {roomType}.\n\nCheck-in is from 2 pm. You can check in online, view your booking or pay your balance here: {manageLink}\n\nNeed directions or an airport pickup? Call or WhatsApp us on {hotelPhone}.\n\nSee you soon,\n{hotelName}",
      active: false,
    },
    {
      id: "after-stay",
      name: "After the stay",
      channel: "email",
      base: "check_out",
      timing: "after",
      days: 1,
      subject: "Thank you for staying with us, {firstName}",
      body: "Hi {firstName},\n\nThank you for staying at {hotelName}. We hope you enjoyed your time in Calabar.\n\nIf you have a moment, a short review helps other travellers find us: {reviewLink}\n\nWe'd love to welcome you back.\n{hotelName}",
      active: false,
    },
  ],
};

export function normalizeGuestMessages(raw: unknown): GuestMessagesSettings {
  const parsed = guestMessagesSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_GUEST_MESSAGES;
}

const KEY = "guest_messages";

export function getGuestMessages(): Promise<GuestMessagesSettings> {
  return readSettingsDoc(KEY, normalizeGuestMessages);
}

export class GuestMessagesValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join("; "));
  }
}

export async function saveGuestMessages(input: unknown): Promise<GuestMessagesSettings> {
  const parsed = guestMessagesSchema.safeParse(input);
  if (!parsed.success) {
    throw new GuestMessagesValidationError(parsed.error.issues.map((i) => i.message));
  }
  const ids = parsed.data.templates.map((t) => t.id);
  if (new Set(ids).size !== ids.length) {
    throw new GuestMessagesValidationError(["Each template needs its own id"]);
  }
  return writeSettingsDoc(KEY, parsed.data);
}
