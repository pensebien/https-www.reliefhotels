import { site } from "@/content/site";
import { getServerConfig } from "@/lib/config";
import type { ReservationRecord } from "@/lib/demo-store";
import type { GuestFeedback } from "@/lib/inquiry-store";

function reservationHtml(record: ReservationRecord): string {
  return `
    <h2>New reservation inquiry — ${site.name}</h2>
    <p><strong>Guest:</strong> ${record.firstName} ${record.lastName}</p>
    <p><strong>Email:</strong> ${record.email}</p>
    <p><strong>Stay preference:</strong> ${record.stayPreference}</p>
    <p><strong>Status:</strong> ${record.status}</p>
    <p><strong>Submitted:</strong> ${record.createdAt}</p>
    <hr />
    <p><strong>Details:</strong></p>
    <p>${record.message.replace(/\n/g, "<br />")}</p>
    <p style="color:#666;font-size:12px;">ID: ${record.id}</p>
  `;
}

function feedbackHtml(record: GuestFeedback): string {
  return `
    <h2>Guest message — ${site.name}</h2>
    <p><strong>From:</strong> ${record.firstName} ${record.lastName}</p>
    <p><strong>Email:</strong> ${record.email}</p>
    ${record.phone ? `<p><strong>Phone:</strong> ${record.phone}</p>` : ""}
    <p><strong>Submitted:</strong> ${record.createdAt}</p>
    <hr />
    <p><strong>Message:</strong></p>
    <p>${record.message.replace(/\n/g, "<br />")}</p>
    <p style="color:#666;font-size:12px;">ID: ${record.id}</p>
  `;
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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.email.from,
      to: [config.email.to],
      reply_to: record.email,
      subject: `[Relief Hotels] Reservation — ${record.firstName} ${record.lastName}`,
      html: reservationHtml(record),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend error:", err);
    return false;
  }

  return true;
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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.email.from,
      to: [config.email.to],
      reply_to: record.email,
      subject: `[Relief Hotels] Guest message — ${record.firstName} ${record.lastName}`,
      html: feedbackHtml(record),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend feedback error:", err);
    return false;
  }

  return true;
}

export async function sendPaymentConfirmationEmail(payload: {
  email: string;
  reference: string;
  amountKobo: number;
  itemLabel: string;
}): Promise<boolean> {
  const config = getServerConfig();
  const amount = (payload.amountKobo / 100).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
  });

  if (!config.email.configured) {
    console.info("[email:demo] payment confirmation", payload.reference);
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.email.from,
      to: [payload.email],
      bcc: [config.email.to],
      subject: `[Relief Hotels] Payment received — ${payload.reference}`,
      html: `
        <h2>Payment confirmed</h2>
        <p>Thank you for your payment to ${site.name}.</p>
        <p><strong>Amount:</strong> ${amount}</p>
        <p><strong>Reference:</strong> ${payload.reference}</p>
        <p><strong>Item:</strong> ${payload.itemLabel}</p>
        <p>Our concierge team will contact you shortly to finalize your booking.</p>
      `,
    }),
  });

  return res.ok;
}
