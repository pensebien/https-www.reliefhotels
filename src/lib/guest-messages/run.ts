/**
 * Daily guest-message run (POST /api/cron/daily, scheduled by Netlify).
 * For each active template, finds bookings whose check-in / check-out /
 * booking date matches today ± the template's days, and sends once.
 */

import { site } from "@/content/site";
import { buildManageBookingUrl } from "@/lib/booking-engine/manage-link";
import { listReservationsForReport, type ReservationRecord } from "@/lib/demo-store";
import { sendGuestMessageEmail } from "@/lib/email";
import { sendGuestText } from "@/lib/notifications";
import { roomDisplayName } from "@/lib/room-names";
import { getRoomSetup, unitLabelMap } from "@/lib/room-setup";
import { claimMessage, settleMessage } from "./log";
import { dueReservations, lagosToday, renderTemplate, targetBaseDate, type MessageValues } from "./render";
import { getGuestMessages, type MessageTemplate } from "./settings";

export type RunResult = {
  date: string;
  sent: number;
  failed: number;
  notConfigured: number;
  alreadySent: number;
};

export async function messageValues(r: ReservationRecord): Promise<MessageValues> {
  const labels = unitLabelMap(await getRoomSetup());
  return {
    firstName: r.firstName,
    lastName: r.lastName,
    checkIn: r.checkIn ?? "",
    checkOut: r.checkOut ?? "",
    nights: String(r.nights ?? ""),
    roomType: roomDisplayName(r.roomId),
    roomNumbers: (r.assignedUnits ?? []).map((u) => labels[u] ?? u).join(", "),
    manageLink: buildManageBookingUrl(r.id) ?? "",
    reviewLink: site.mapsUrl,
    hotelName: site.name,
    hotelPhone: site.phone,
  };
}

function smsConfigured(channel: "sms" | "whatsapp"): boolean {
  if (!process.env.TERMII_API_KEY && channel === "sms") return false;
  if (channel === "whatsapp") {
    return Boolean(
      (process.env.TERMII_API_KEY && (process.env.TERMII_WHATSAPP_DEVICE_ID || process.env.TERMII_SENDER_ID)) ||
        (process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_PHONE_ID),
    );
  }
  return true;
}

export async function deliver(
  template: Pick<MessageTemplate, "channel" | "subject" | "body">,
  reservation: ReservationRecord,
): Promise<"sent" | "failed" | "not_configured"> {
  const values = await messageValues(reservation);
  const body = renderTemplate(template.body, values);
  if (template.channel === "email") {
    return sendGuestMessageEmail(reservation.email, renderTemplate(template.subject, values), body);
  }
  if (!reservation.phone) return "failed";
  if (!smsConfigured(template.channel)) return "not_configured";
  return (await sendGuestText(reservation.phone, body, template.channel)) ? "sent" : "failed";
}

export async function runGuestMessages(now = Date.now()): Promise<RunResult> {
  const today = lagosToday(now);
  const result: RunResult = { date: today, sent: 0, failed: 0, notConfigured: 0, alreadySent: 0 };
  const templates = (await getGuestMessages()).templates.filter((t) => t.active);
  if (templates.length === 0) return result;

  // One query covering every template's target date. Starts a day early:
  // a stay checking out on day T occupies T−1, not T.
  const targets = templates.map((t) => targetBaseDate(t, today)).sort();
  const first = new Date(`${targets[0]}T00:00:00Z`);
  first.setUTCDate(first.getUTCDate() - 1);
  const reservations = await listReservationsForReport(
    first.toISOString().slice(0, 10),
    targets[targets.length - 1],
  );

  for (const template of templates) {
    for (const reservation of dueReservations(template, reservations, today)) {
      const claim = await claimMessage({
        templateId: template.id,
        reservationId: reservation.id,
        channel: template.channel,
        recipient: template.channel === "email" ? reservation.email : (reservation.phone ?? ""),
      });
      if (!claim) {
        result.alreadySent += 1;
        continue;
      }
      const status = await deliver(template, reservation).catch(() => "failed" as const);
      await settleMessage(claim, status);
      if (status === "sent") result.sent += 1;
      else if (status === "not_configured") result.notConfigured += 1;
      else result.failed += 1;
    }
  }
  return result;
}
