import { logNotificationAttempt } from "@/lib/db/notification-log";

export type NotificationEvent =
  | "reservation.created"
  | "payment.verified"
  | "payment.awaiting_manual_review"
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

/**
 * Manager SMS/WhatsApp only after a verified payment (e.g. 20% room deposit),
 * or a manual-bank-transfer claim that needs a human to go verify it — an
 * unverified claim, not a confirmed payment, so it gets distinct wording
 * below rather than being folded into "payment.verified".
 */
function isManagerAlertAllowed(event: NotificationEvent): boolean {
  return event === "payment.verified" || event === "payment.awaiting_manual_review";
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
    case "payment.awaiting_manual_review": {
      const guest = payload.guestName ? ` from ${payload.guestName}` : "";
      const phone = payload.phone ? ` (${payload.phone})` : "";
      return `${prefix} Guest claims a bank transfer${guest}${phone} — verify in your bank app, then approve. ${payload.summary} Ref:${payload.referenceId}`;
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
export async function notifyManager(
  payload: NotifyPayload,
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
    console.info("[notify:skipped-unpaid]", {
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
    console.info("[notify:demo]", {
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
    console.info("[notify:console]", { to: managerPhone, event: payload.event, body });
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
        console.info("[notify:whatsapp:fallback-log]", body);
        errors.push("WhatsApp failed");
      }
    }

    const sent =
      channel === "both"
        ? smsSent || whatsappSent
        : channel === "sms"
          ? smsSent
          : whatsappSent;

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
    console.error("[notify:error]", message);
    return {
      sent: false,
      channel,
      smsSent,
      whatsappSent,
      error: message,
    };
  }
}
