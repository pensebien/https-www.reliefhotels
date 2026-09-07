import { site } from "@/content/site";
import { getServerConfig } from "@/lib/config";
import type { ReservationRecord } from "@/lib/demo-store";
import type {
  DiningReservation,
  EventInquiry,
  GuestFeedback,
} from "@/lib/inquiry-store";

/** Guest-submitted strings (name, email, message, ...) must never be interpolated into HTML unescaped. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absoluteUrl(path: string): string {
  return `${getServerConfig().appUrl}${path}`;
}

/**
 * Shared branded shell every transactional email renders through — dark header with the
 * wordmark, a white content card, and a footer with contact details. Table-based markup and
 * inline styles throughout since email clients don't reliably support external/head CSS.
 */
function emailLayout(options: { preheader: string; bodyHtml: string }): string {
  const logoUrl = absoluteUrl(site.logoSrc);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f2;">
    <span style="display:none;font-size:1px;color:#f4f4f2;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${escapeHtml(options.preheader)}
    </span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e4df;">
            <tr>
              <td style="background-color:#0f172a;padding:28px 32px;text-align:center;">
                <img src="${logoUrl}" width="40" height="40" alt="${escapeHtml(site.name)}" style="display:block;margin:0 auto 10px;border-radius:8px;" />
                <div style="color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:0.04em;">
                  ${escapeHtml(site.name)}
                </div>
                <div style="color:#2dd4bf;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;margin-top:6px;">
                  ${escapeHtml(site.location)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:15px;line-height:1.6;">
                ${options.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px;background-color:#faf9f6;border-top:1px solid #eeece6;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#78716c;text-align:center;">
                <p style="margin:0 0 6px;">${escapeHtml(site.address.full)}</p>
                <p style="margin:0;">
                  <a href="${site.phoneHref}" style="color:#14b8a6;text-decoration:none;">${escapeHtml(site.phone)}</a>
                  &nbsp;&middot;&nbsp;
                  <a href="mailto:${site.email}" style="color:#14b8a6;text-decoration:none;">${escapeHtml(site.email)}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailsCard(rows: Array<[string, string | undefined]>): string {
  const cells = rows
    .filter((row): row is [string, string] => Boolean(row[1]))
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eeece6;color:#78716c;font-size:13px;width:40%;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eeece6;color:#1f2937;font-size:14px;font-weight:600;">${value}</td>
        </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f6;border-radius:12px;padding:4px 16px;margin:20px 0;">${cells}</table>`;
}

function messageBlock(label: string, message: string): string {
  return `
    <p style="margin:20px 0 6px;color:#78716c;font-size:13px;">${escapeHtml(label)}</p>
    <p style="margin:0;padding:14px 16px;background-color:#faf9f6;border-radius:12px;white-space:pre-wrap;">${escapeHtml(message)}</p>`;
}

/** Guest-facing acknowledgment sent right after a stay/tour reservation request comes in. */
export function guestReservationConfirmationHtml(record: ReservationRecord): string {
  const body = `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(record.firstName)},</p>
    <p style="margin:0 0 8px;">Thank you for your interest in ${escapeHtml(site.name)}. We've received your request and our concierge team will confirm availability within 24 hours.</p>
    ${detailsCard([
      ["Stay preference", escapeHtml(record.stayPreference)],
      ["Check-in", record.checkIn ? escapeHtml(record.checkIn) : undefined],
      ["Check-out", record.checkOut ? escapeHtml(record.checkOut) : undefined],
      ["Guests", String(record.guests)],
      ["Reference", escapeHtml(record.id)],
    ])}
    <p style="margin:20px 0 0;">Need to reach us sooner? Call or WhatsApp <a href="${site.phoneHref}" style="color:#14b8a6;">${escapeHtml(site.phone)}</a>.</p>`;

  return emailLayout({
    preheader: `We've received your reservation request, ${record.firstName}.`,
    bodyHtml: body,
  });
}

/** Internal manager notification for a new stay/tour reservation inquiry. */
export function reservationHtml(record: ReservationRecord): string {
  const body = `
    <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;">New reservation inquiry</h2>
    ${detailsCard([
      ["Guest", `${escapeHtml(record.firstName)} ${escapeHtml(record.lastName)}`],
      ["Email", escapeHtml(record.email)],
      ["Phone", record.phone ? escapeHtml(record.phone) : undefined],
      ["Stay preference", escapeHtml(record.stayPreference)],
      ["Check-in", record.checkIn ? escapeHtml(record.checkIn) : undefined],
      ["Check-out", record.checkOut ? escapeHtml(record.checkOut) : undefined],
      ["Guests", String(record.guests)],
      ["Status", escapeHtml(record.status)],
      ["Submitted", escapeHtml(record.createdAt)],
      ["Reference", escapeHtml(record.id)],
    ])}
    ${messageBlock("Details", record.message)}`;

  return emailLayout({
    preheader: `New reservation inquiry from ${record.firstName} ${record.lastName}`,
    bodyHtml: body,
  });
}

/** Guest-facing acknowledgment sent right after a contact-form message comes in. */
export function guestFeedbackAckHtml(record: GuestFeedback): string {
  const body = `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(record.firstName)},</p>
    <p style="margin:0 0 8px;">Thanks for reaching out to ${escapeHtml(site.name)} — we've received your message and someone from our team will get back to you within 24 hours.</p>
    ${messageBlock("Your message", record.message)}
    <p style="margin:20px 0 0;">For anything urgent, call or WhatsApp <a href="${site.phoneHref}" style="color:#14b8a6;">${escapeHtml(site.phone)}</a>.</p>`;

  return emailLayout({
    preheader: `We've received your message, ${record.firstName}.`,
    bodyHtml: body,
  });
}

/** Internal manager notification for a new contact-form message. */
export function feedbackHtml(record: GuestFeedback): string {
  const body = `
    <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;">Guest message</h2>
    ${detailsCard([
      ["From", `${escapeHtml(record.firstName)} ${escapeHtml(record.lastName)}`],
      ["Email", escapeHtml(record.email)],
      ["Phone", record.phone ? escapeHtml(record.phone) : undefined],
      ["Submitted", escapeHtml(record.createdAt)],
      ["Reference", escapeHtml(record.id)],
    ])}
    ${messageBlock("Message", record.message)}`;

  return emailLayout({
    preheader: `New guest message from ${record.firstName} ${record.lastName}`,
    bodyHtml: body,
  });
}

/** Guest-facing acknowledgment for a dining reservation request. */
export function diningReservationGuestHtml(record: DiningReservation): string {
  const body = `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(record.firstName)},</p>
    <p style="margin:0 0 8px;">We've received your dining reservation request at ${escapeHtml(site.name)}. Our team will confirm your table shortly.</p>
    ${detailsCard([
      ["Venue", escapeHtml(record.venue)],
      ["Date", escapeHtml(record.reservationDate)],
      ["Time", escapeHtml(record.reservationTime)],
      ["Party size", escapeHtml(record.partySize)],
      ["Reference", escapeHtml(record.id)],
    ])}
    ${record.notes ? messageBlock("Your notes", record.notes) : ""}
    <p style="margin:20px 0 0;">Questions before then? Call or WhatsApp <a href="${site.phoneHref}" style="color:#14b8a6;">${escapeHtml(site.phone)}</a>.</p>`;

  return emailLayout({
    preheader: `Your dining reservation request at ${site.name}`,
    bodyHtml: body,
  });
}

/** Internal manager notification for a new dining reservation request. */
export function diningReservationStaffHtml(record: DiningReservation): string {
  const body = `
    <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;">New dining reservation</h2>
    ${detailsCard([
      ["Guest", `${escapeHtml(record.firstName)} ${escapeHtml(record.lastName)}`],
      ["Email", escapeHtml(record.email)],
      ["Venue", escapeHtml(record.venue)],
      ["Date", escapeHtml(record.reservationDate)],
      ["Time", escapeHtml(record.reservationTime)],
      ["Party size", escapeHtml(record.partySize)],
      ["Submitted", escapeHtml(record.createdAt)],
      ["Reference", escapeHtml(record.id)],
    ])}
    ${record.notes ? messageBlock("Notes", record.notes) : ""}`;

  return emailLayout({
    preheader: `New dining reservation from ${record.firstName} ${record.lastName}`,
    bodyHtml: body,
  });
}

/** Guest-facing acknowledgment for an event-space inquiry. */
export function eventInquiryGuestHtml(record: EventInquiry): string {
  const body = `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(record.firstName)},</p>
    <p style="margin:0 0 8px;">Thank you for your event inquiry with ${escapeHtml(site.name)}. Our events team will follow up with availability and a proposal shortly.</p>
    ${detailsCard([
      ["Event type", escapeHtml(record.eventType)],
      ["Date", escapeHtml(record.eventDate)],
      ["Guest count", escapeHtml(record.guestCount)],
      ["Reference", escapeHtml(record.id)],
    ])}
    ${messageBlock("Your message", record.message)}
    <p style="margin:20px 0 0;">Need to reach us sooner? Call or WhatsApp <a href="${site.phoneHref}" style="color:#14b8a6;">${escapeHtml(site.phone)}</a>.</p>`;

  return emailLayout({
    preheader: `Your event inquiry with ${site.name}`,
    bodyHtml: body,
  });
}

/** Internal manager notification for a new event-space inquiry. */
export function eventInquiryStaffHtml(record: EventInquiry): string {
  const body = `
    <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;">New event inquiry</h2>
    ${detailsCard([
      ["Guest", `${escapeHtml(record.firstName)} ${escapeHtml(record.lastName)}`],
      ["Email", escapeHtml(record.email)],
      ["Phone", escapeHtml(record.phone)],
      ["Event type", escapeHtml(record.eventType)],
      ["Date", escapeHtml(record.eventDate)],
      ["Guest count", escapeHtml(record.guestCount)],
      ["Submitted", escapeHtml(record.createdAt)],
      ["Reference", escapeHtml(record.id)],
    ])}
    ${messageBlock("Message", record.message)}`;

  return emailLayout({
    preheader: `New event inquiry from ${record.firstName} ${record.lastName}`,
    bodyHtml: body,
  });
}

export type PaymentConfirmationInput = {
  email: string;
  reference: string;
  amountKobo: number;
  itemLabel: string;
};

export function formatNairaFromKobo(amountKobo: number): string {
  return (amountKobo / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });
}

export function paymentConfirmationHtml(payload: PaymentConfirmationInput): string {
  const body = `
    <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;">Payment confirmed</h2>
    <p style="margin:0 0 8px;">Thank you for your payment to ${escapeHtml(site.name)}.</p>
    ${detailsCard([
      ["Amount", escapeHtml(formatNairaFromKobo(payload.amountKobo))],
      ["Reference", escapeHtml(payload.reference)],
      ["Item", escapeHtml(payload.itemLabel)],
    ])}
    <p style="margin:20px 0 0;">Our concierge team will contact you shortly to finalize your booking.</p>`;

  return emailLayout({
    preheader: `Payment received — ${payload.reference}`,
    bodyHtml: body,
  });
}

type ResendEmailInput = {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
  bcc?: string[];
};

/** Shared Resend send path — the one seam every transactional email goes through. */
async function sendResendEmail(input: ResendEmailInput): Promise<boolean> {
  const config = getServerConfig();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.email.from,
      to: input.to,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      ...(input.bcc ? { bcc: input.bcc } : {}),
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend error:", err);
    return false;
  }

  return true;
}

export async function sendReservationEmail(
  record: ReservationRecord,
): Promise<boolean> {
  const config = getServerConfig();

  if (!config.email.configured) {
    console.info("[email:demo]", {
      to: config.email.to,
      subject: `Reservation: ${record.firstName} ${record.lastName}`,
      id: record.id,
    });
    return false;
  }

  return sendResendEmail({
    to: [config.email.to],
    replyTo: record.email,
    subject: `[Relief Hotels] Reservation — ${record.firstName} ${record.lastName}`,
    html: reservationHtml(record),
  });
}

/** Sends the guest their "we've received your request" acknowledgment. */
export async function sendGuestReservationConfirmation(
  record: ReservationRecord,
): Promise<boolean> {
  const config = getServerConfig();

  if (!config.email.configured) {
    console.info("[email:demo] guest reservation confirmation", record.email);
    return false;
  }

  return sendResendEmail({
    to: [record.email],
    subject: `We've received your reservation request — ${site.name}`,
    html: guestReservationConfirmationHtml(record),
  });
}

export async function sendFeedbackEmail(
  record: GuestFeedback,
): Promise<boolean> {
  const config = getServerConfig();

  if (!config.email.configured) {
    console.info("[email:demo] guest feedback", {
      to: config.email.to,
      from: `${record.firstName} ${record.lastName}`,
      id: record.id,
    });
    return false;
  }

  return sendResendEmail({
    to: [config.email.to],
    replyTo: record.email,
    subject: `[Relief Hotels] Guest message — ${record.firstName} ${record.lastName}`,
    html: feedbackHtml(record),
  });
}

/** Sends the guest their "we've received your message" acknowledgment. */
export async function sendGuestFeedbackAck(
  record: GuestFeedback,
): Promise<boolean> {
  const config = getServerConfig();

  if (!config.email.configured) {
    console.info("[email:demo] guest feedback ack", record.email);
    return false;
  }

  return sendResendEmail({
    to: [record.email],
    subject: `We've received your message — ${site.name}`,
    html: guestFeedbackAckHtml(record),
  });
}

/** Sends both the guest acknowledgment and the manager notification for a dining reservation. */
export async function sendDiningReservationEmails(
  record: DiningReservation,
): Promise<{ guestSent: boolean; staffSent: boolean }> {
  const config = getServerConfig();

  if (!config.email.configured) {
    console.info("[email:demo] dining reservation", record.id);
    return { guestSent: false, staffSent: false };
  }

  const [guestSent, staffSent] = await Promise.all([
    sendResendEmail({
      to: [record.email],
      subject: `Your dining reservation request — ${site.name}`,
      html: diningReservationGuestHtml(record),
    }),
    sendResendEmail({
      to: [config.email.to],
      replyTo: record.email,
      subject: `[Relief Hotels] Dining reservation — ${record.firstName} ${record.lastName}`,
      html: diningReservationStaffHtml(record),
    }),
  ]);

  return { guestSent, staffSent };
}

/** Sends both the guest acknowledgment and the manager notification for an event inquiry. */
export async function sendEventInquiryEmails(
  record: EventInquiry,
): Promise<{ guestSent: boolean; staffSent: boolean }> {
  const config = getServerConfig();

  if (!config.email.configured) {
    console.info("[email:demo] event inquiry", record.id);
    return { guestSent: false, staffSent: false };
  }

  const [guestSent, staffSent] = await Promise.all([
    sendResendEmail({
      to: [record.email],
      subject: `Your event inquiry — ${site.name}`,
      html: eventInquiryGuestHtml(record),
    }),
    sendResendEmail({
      to: [config.email.to],
      replyTo: record.email,
      subject: `[Relief Hotels] Event inquiry — ${record.firstName} ${record.lastName}`,
      html: eventInquiryStaffHtml(record),
    }),
  ]);

  return { guestSent, staffSent };
}

export async function sendPaymentConfirmationEmail(
  payload: PaymentConfirmationInput,
): Promise<boolean> {
  const config = getServerConfig();

  if (!config.email.configured) {
    console.info("[email:demo] payment confirmation", payload.reference);
    return false;
  }

  return sendResendEmail({
    to: [payload.email],
    bcc: [config.email.to],
    subject: `[Relief Hotels] Payment received — ${payload.reference}`,
    html: paymentConfirmationHtml(payload),
  });
}
