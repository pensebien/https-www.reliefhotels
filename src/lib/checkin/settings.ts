/**
 * Online check-in settings (Sirvoy guest portal "self check-ins"): when it
 * opens, whether an ID photo is required, the message shown afterwards, and
 * how long ID details are kept after check-out (Nigeria Data Protection Act:
 * keep personal data no longer than needed).
 */

import { readSettingsDoc, writeSettingsDoc } from "@/lib/settings-store";
import { z } from "zod";

export const checkinSettingsSchema = z.object({
  enabled: z.boolean(),
  opensDaysBefore: z.number().int().min(0).max(30),
  requireIdPhoto: z.boolean(),
  /** Shown to the guest once they've checked in online. */
  instructions: z.string().trim().max(1000),
  /** ID number and photo are deleted this many days after check-out. */
  retentionDays: z.number().int().min(1).max(365),
});

export type CheckinSettings = z.infer<typeof checkinSettingsSchema>;

export const DEFAULT_CHECKIN_SETTINGS: CheckinSettings = {
  enabled: true,
  opensDaysBefore: 3,
  requireIdPhoto: false,
  instructions:
    "You're checked in. Show your booking reference at reception from 2 pm on arrival day to collect your key.",
  retentionDays: 30,
};

export function normalizeCheckinSettings(raw: unknown): CheckinSettings {
  const parsed = checkinSettingsSchema.safeParse({
    ...DEFAULT_CHECKIN_SETTINGS,
    ...(raw && typeof raw === "object" ? raw : {}),
  });
  return parsed.success ? parsed.data : DEFAULT_CHECKIN_SETTINGS;
}

const KEY = "online_checkin";

export function getCheckinSettings(): Promise<CheckinSettings> {
  return readSettingsDoc(KEY, normalizeCheckinSettings);
}

export async function saveCheckinSettings(input: unknown): Promise<CheckinSettings> {
  const parsed = checkinSettingsSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  return writeSettingsDoc(KEY, parsed.data);
}
