import { site } from "@/content/site";
import { getServerConfig } from "@/lib/config";
import type { ReservationRecord } from "@/lib/demo-store";
import type { GuestFeedback } from "@/lib/inquiry-store";

/** Guest-submitted strings (name, email, message, ...) must never be interpolated into HTML unescaped. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function reservationHtml(record: ReservationRecord): string {
  return `
    <h2>New reservation inquiry — ${escapeHtml(site.name)}</h2>
    <p><strong>Guest:</strong> ${escapeHtml(record.firstName)} ${escapeHtml(record.lastName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(record.email)}</p>
    <p><strong>Stay preference:</strong> ${escapeHtml(record.stayPreference)}</p>
    <p><strong>Status:</strong> ${escapeHtml(record.status)}</p>
    <p><strong>Submitted:</strong> ${escapeHtml(record.createdAt)}</p>
    <hr />
    <p><strong>Details:</strong></p>
    <p>${escapeHtml(record.message).replace(/\n/g, "<br />")}</p>
    <p style="color:#666;font-size:12px;">ID: ${escapeHtml(record.id)}</p>
  `;
}

export function feedbackHtml(record: GuestFeedback): string {
  return `
    <h2>Guest message — ${escapeHtml(site.name)}</h2>
    <p><strong>From:</strong> ${escapeHtml(record.firstName)} ${escapeHtml(record.lastName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(record.email)}</p>
    ${record.phone ? `<p><strong>Phone:</strong> ${escapeHtml(record.phone)}</p>` : ""}
    <p><strong>Submitted:</strong> ${escapeHtml(record.createdAt)}</p>
    <hr />
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(record.message).replace(/\n/g, "<br />")}</p>
    <p style="color:#666;font-size:12px;">ID: ${escapeHtml(record.id)}</p>
  `;
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
  return `
    <h2>Payment confirmed</h2>
    <p>Thank you for your payment to ${escapeHtml(site.name)}.</p>
    <p><strong>Amount:</strong> ${formatNairaFromKobo(payload.amountKobo)}</p>
    <p><strong>Reference:</strong> ${escapeHtml(payload.reference)}</p>
    <p><strong>Item:</strong> ${escapeHtml(payload.itemLabel)}</p>
    <p>Our concierge team will contact you shortly to finalize your booking.</p>
  `;
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

export type BankTransferApprovalInput = {
  to: string;
  reference: string;
  guestName: string;
  amountKobo: number;
  itemLabel: string;
  /** Absent when `BANK_TRANSFER_LINK_SECRET` isn't configured — email still goes out with a note instead of a link. */
  approvalUrl?: string;
};

export function bankTransferApprovalHtml(payload: BankTransferApprovalInput): string {
  const cta = payload.approvalUrl
    ? `<p><a href="${escapeHtml(payload.approvalUrl)}">Review and approve this payment</a></p>`
    : `<p style="color:#b45309;">No approval link — BANK_TRANSFER_LINK_SECRET isn't configured. Approve from the staff dashboard instead.</p>`;

  return `
    <h2>Bank transfer awaiting approval</h2>
    <p>A guest says they've paid a deposit by direct bank transfer. This has <strong>not</strong> been verified by any payment gateway — please check your bank app for the incoming transfer before approving.</p>
    <p><strong>Guest:</strong> ${escapeHtml(payload.guestName)}</p>
    <p><strong>Amount:</strong> ${formatNairaFromKobo(payload.amountKobo)}</p>
    <p><strong>Item:</strong> ${escapeHtml(payload.itemLabel)}</p>
    <p><strong>Reference:</strong> ${escapeHtml(payload.reference)}</p>
    ${cta}
    <p style="color:#666;font-size:12px;">The room stays unreserved until this is approved — either via the link above or the staff dashboard.</p>
  `;
}

export async function sendBankTransferApprovalEmail(
  payload: BankTransferApprovalInput,
): Promise<boolean> {
  const config = getServerConfig();

  if (!config.email.configured || !payload.to) {
    console.info("[email:demo] bank transfer awaiting approval", {
      reference: payload.reference,
      to: payload.to || "(BANK_TRANSFER_APPROVAL_EMAIL unset)",
      approvalUrl: payload.approvalUrl,
    });
    return false;
  }

  return sendResendEmail({
    to: [payload.to],
    subject: `[Relief Hotels] Bank transfer awaiting approval — ${payload.reference}`,
    html: bankTransferApprovalHtml(payload),
  });
}
