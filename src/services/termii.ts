/**
 * Termii WhatsApp sender.
 *
 * POSTs to Termii's message endpoint with `channel: "whatsapp"`, which routes
 * through their WhatsApp gateway. Env:
 *   TERMII_API_KEY    required
 *   TERMII_SENDER_ID  the WhatsApp sender/device approved on your Termii account
 *                     (TERMII_WHATSAPP_DEVICE_ID, if set, takes precedence)
 *   TERMII_BASE_URL   optional; default https://api.termii.com — Termii accounts
 *                     can have their own base URL shown in the dashboard
 */

import { Logger } from "@/lib/logger";

const log = new Logger("termii");

export type TermiiWhatsAppParams = {
  /** Recipient in international format without "+", e.g. 2348012345678. */
  to: string;
  /** Message text. */
  message: string;
};

export type TermiiResult = { ok: true; messageId?: string } | { ok: false; error: string };

export async function sendTermiiWhatsApp({ to, message }: TermiiWhatsAppParams): Promise<TermiiResult> {
  const apiKey = process.env.TERMII_API_KEY;
  const from = process.env.TERMII_WHATSAPP_DEVICE_ID || process.env.TERMII_SENDER_ID;
  if (!apiKey || !from) return { ok: false, error: "TERMII_API_KEY / TERMII_SENDER_ID not set" };

  const base = (process.env.TERMII_BASE_URL || "https://api.termii.com").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to: to.replace(/\D/g, ""),
        from,
        sms: message,
        type: "plain",
        channel: "whatsapp",
      }),
    });
    const body = (await res.json().catch(() => null)) as { message_id?: string; message?: string; code?: string } | null;
    if (!res.ok) {
      const error = `Termii ${res.status}: ${body?.message ?? "request failed"}`;
      log.warning("Termii WhatsApp send failed", { status: res.status, error });
      return { ok: false, error };
    }
    return { ok: true, messageId: body?.message_id };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    log.error("Termii WhatsApp request error", { error });
    return { ok: false, error };
  }
}
