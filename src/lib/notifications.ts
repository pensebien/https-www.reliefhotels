import { Logger } from "@/lib/logger";
import { enqueueNotification } from "@/lib/outbox";
import { logNotificationAttempt } from "@/lib/db/notification-log";

const log = new Logger("notify");

export type NotificationEvent =
  | "reservation.created"
  | "payment.verified"
  | "event.inquiry.created"
  | "dining.reservation.created";

export type NotifyPayload = {
  event: NotificationEvent;
  referenceId: string;
  guestName?: string;
  email?: string;
  phone?: string;
  summary: string;
  metadata?: Record<string, string>;
};

export type NotifyResult = {
  sent: boolean;
  channel: "sms" | "whatsapp" | "both" | "console" | "none";
  smsSent?: boolean;
  whatsappSent?: boolean;
  provider?: string;
  error?: string;
};

/** Manager SMS/WhatsApp only after a verified payment (e.g. 20% room deposit). */
function isManagerAlertAllowed(event: NotificationEvent): boolean {
  return event === "payment.verified";
}

function buildMessageBody(payload: NotifyPayload): string {
  const prefix = "Relief Hotels:";
  switch (payload.event) {
    case "reservation.created":
      return `${prefix} New reservation from ${payload.guestName ?? "guest"}. ${payload.summary} Ref:${payload.referenceId}`;
    case "payment.verified": {
      const guest = payload.guestName ? ` from ${payload.guestName}` : "";
      const phone = payload.phone ? ` (${payload.phone})` : "";
      return `${prefix} Deposit payment received${guest}${phone}. ${payload.summary} Ref:${payload.referenceId}`;
    }
    case "event.inquiry.created":
      return `${prefix} Event inquiry. ${payload.summary} Ref:${payload.referenceId}`;
    case "dining.reservation.created":
      return `${prefix} Dining request. ${payload.summary} Ref:${payload.referenceId}`;
    default:
      return `${prefix} ${payload.summary}`;
  }
}

async function sendTermiiSms(to: string, message: string): Promise<boolean> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID ?? "Relief";
  if (!apiKey) return false;

  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      to,
      from: senderId,
      sms: message,
      type: "plain",
      channel: "generic",
    }),
  });

  return res.ok;
}

async function sendTermiiWhatsApp(to: string, message: string): Promise<boolean> {
  const apiKey = process.env.TERMII_API_KEY;
  const deviceId =
    process.env.TERMII_WHATSAPP_DEVICE_ID ?? process.env.TERMII_SENDER_ID;
  if (!apiKey || !deviceId) return false;

  const res = await fetch("https://api.ng.termii.com/api/whatsapp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      to,
      from: deviceId,
      type: "text",
      channel: "whatsapp",
      sms: message,
    }),
  });

  return res.ok;
}

async function sendMetaWhatsApp(to: string, message: string): Promise<boolean> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return false;

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ""),
        type: "text",
        text: { body: message },
      }),
    },
  );

  return res.ok;
}

async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  const provider = (process.env.WHATSAPP_PROVIDER ?? "termii").toLowerCase();
  if (provider === "meta") return sendMetaWhatsApp(to, message);
  return sendTermiiWhatsApp(to, message);
}

/**
 * Notify hotel manager per Phase 0 KPI #5 (ADR-003: SMS + WhatsApp at launch).
 */
/**
 * Text a guest (scheduled guest messages). Returns false when the channel
 * isn't configured. WhatsApp outside a guest-started conversation may need
 * an approved template with the provider.
 */
export async function sendGuestText(
  to: string,
  message: string,
  channel: "sms" | "whatsapp",
): Promise<boolean> {
  return channel === "sms" ? sendTermiiSms(to, message) : sendWhatsApp(to, message);
}

export async function notifyManager(
  payload: NotifyPayload,
  options: { fromOutbox?: boolean } = {},
): Promise<NotifyResult> {
  const managerPhone = process.env.MANAGER_PHONE;
  const channel = (process.env.NOTIFY_CHANNEL ?? "console") as
    | "sms"
    | "whatsapp"
    | "both"
    | "console"
    | "none";

  const body = buildMessageBody(payload);

  if (!isManagerAlertAllowed(payload.event)) {
    log.info("Manager alert skipped: payment not verified", {
      event: payload.event,
      referenceId: payload.referenceId,
      reason: "Manager SMS/WhatsApp requires verified payment",
    });
    return {
      sent: false,
      channel: "none",
      provider: "payment-required",
    };
  }

  if (channel === "none") {
    return { sent: false, channel: "none" };
  }

  const hasTermii = Boolean(process.env.TERMII_API_KEY && managerPhone);
  const wantsSms = channel === "sms" || channel === "both";
  const wantsWa = channel === "whatsapp" || channel === "both";

  if (!managerPhone || (!hasTermii && channel !== "console")) {
    log.info("Manager alert not sent: no SMS provider (demo)", {
      to: managerPhone ?? "(unset)",
      event: payload.event,
      body,
      channel,
      ...payload.metadata,
    });
    return {
      sent: false,
      channel: "console",
      provider: "console-log",
      smsSent: false,
      whatsappSent: false,
    };
  }

  if (channel === "console") {
    log.info("Manager alert (console channel)", { to: managerPhone, event: payload.event, body });
    return { sent: false, channel: "console", provider: "console-log" };
  }

  let smsSent = false;
  let whatsappSent = false;
  const errors: string[] = [];

  try {
    if (wantsSms && hasTermii) {
      smsSent = await sendTermiiSms(managerPhone!, body);
      await logNotificationAttempt({
        event: payload.event,
        referenceId: payload.referenceId,
        channel: "sms",
        success: smsSent,
        provider: "termii",
        errorMessage: smsSent ? undefined : "Termii SMS failed",
      });
      if (!smsSent) errors.push("SMS failed");
    }

    if (wantsWa) {
      whatsappSent = await sendWhatsApp(managerPhone!, body);
      const waProvider = process.env.WHATSAPP_PROVIDER ?? "termii";
      await logNotificationAttempt({
        event: payload.event,
        referenceId: payload.referenceId,
        channel: "whatsapp",
        success: whatsappSent,
        provider: waProvider,
        errorMessage: whatsappSent ? undefined : "WhatsApp send failed",
      });
      if (!whatsappSent) {
        log.warning("Manager WhatsApp failed", { event: payload.event, reference_id: payload.referenceId });
        errors.push("WhatsApp failed");
      }
    }

    const sent =
      channel === "both"
        ? smsSent || whatsappSent
        : channel === "sms"
          ? smsSent
          : whatsappSent;
    // A paid booking's alert must reach the manager: retry it later.
    if (!sent && !options.fromOutbox) {
      await enqueueNotification("manager-alert", payload as unknown as Record<string, unknown>, errors.join("; "));
    }

    return {
      sent,
      channel,
      smsSent,
      whatsappSent,
      provider: "termii",
      error: errors.length ? errors.join("; ") : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "notify failed";
    log.error("Manager alert failed", { event: payload.event, reference_id: payload.referenceId, error: message });
    if (!options.fromOutbox) {
      await enqueueNotification("manager-alert", payload as unknown as Record<string, unknown>, message);
    }
    return {
      sent: false,
      channel,
      smsSent,
      whatsappSent,
      error: message,
    };
  }
}
