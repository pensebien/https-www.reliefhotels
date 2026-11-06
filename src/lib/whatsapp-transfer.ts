/**
 * Manual bank-transfer flow over WhatsApp.
 *
 * 1. Guest books and picks "bank transfer": we message them the hotel's
 *    Moniepoint account, the exact amount and their booking reference, and
 *    alert the front desk on the hotel's own WhatsApp number.
 * 2. The desk sees the credit on the Moniepoint POS, matches it to the booking
 *    in the staff ops board and marks it paid (see staff-ops.ts).
 * 3. The guest gets a payment-confirmed message.
 *
 * Sending reuses the Termii/Meta WhatsApp senders in notifications.ts. A send
 * that fails is queued in the outbox and retried, so a provider blip never
 * costs a booking its payment instructions.
 */

import { buildConfirmPaymentUrl } from "@/lib/booking-engine/confirm-link";
import { logNotificationAttempt } from "@/lib/db/notification-log";
import type { ReservationRecord } from "@/lib/demo-store";
import { Logger } from "@/lib/logger";
import { sendGuestText, type NotificationEvent } from "@/lib/notifications";
import { enqueueNotification } from "@/lib/outbox";
import { roomDisplayName } from "@/lib/room-names";
import { normalizeWhatsappNumber } from "@/lib/whatsapp-number";

const log = new Logger("whatsapp-transfer");

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** Short reference guests quote in the transfer description and staff search by. */
export function bookingRef(reservationId: string): string {
  return reservationId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export { normalizeWhatsappNumber };

export type TransferAccount = { bankName: string; accountNumber: string; accountName: string };

/** The hotel's Moniepoint account, from env. Null until all three are set. */
export function transferAccount(): TransferAccount | null {
  const bankName = process.env.TRANSFER_BANK_NAME?.trim() || "Moniepoint MFB";
  const accountNumber = process.env.TRANSFER_ACCOUNT_NUMBER?.trim();
  const accountName = process.env.TRANSFER_ACCOUNT_NAME?.trim();
  return accountNumber && accountName ? { bankName, accountNumber, accountName } : null;
}

/** Where internal alerts go: the hotel's customer-service WhatsApp, else the manager's phone. */
export function frontDeskNumber(): string | null {
  const raw = process.env.FRONT_DESK_WHATSAPP ?? process.env.MANAGER_PHONE;
  return raw ? normalizeWhatsappNumber(raw) : null;
}

const lagosTime = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });

export function amountDueNgn(r: Pick<ReservationRecord, "quotedDepositNgn" | "quotedTotalNgn">): number {
  return r.quotedDepositNgn ?? r.quotedTotalNgn ?? 0;
}

/**
 * Message 1 — to the guest. The account number sits alone on its own line so
 * a long-press selects just the digits for copying.
 */
export function guestTransferMessage(r: ReservationRecord, account: TransferAccount): string {
  const ref = bookingRef(r.id);
  const due = amountDueNgn(r);
  return [
    `*Relief Hotels & Suites*`,
    `Hello ${r.firstName}, your room is reserved and waiting for payment.`,
    ``,
    `*Booking reference:* #${ref}`,
    `*Room:* ${roomDisplayName(r.roomId)}${r.units && r.units > 1 ? ` × ${r.units}` : ""}`,
    `*Stay:* ${r.checkIn} → ${r.checkOut}`,
    `*Amount due now:* ${naira(due)}`,
    ``,
    `*Pay by bank transfer*`,
    `Bank: ${account.bankName}`,
    `Account name: ${account.accountName}`,
    `Account number (press and hold the number to copy):`,
    `\`\`\`${account.accountNumber}\`\`\``,
    ``,
    `Please transfer the EXACT amount of ${naira(due)} and include Reference #${ref} in the transfer description.`,
    r.holdExpiresAt ? `Your room is held until ${lagosTime(r.holdExpiresAt)}.` : ``,
    `We'll message you here as soon as your payment is confirmed.`,
  ]
    .filter((line, i, all) => line !== `` || all[i - 1] !== ``)
    .join("\n");
}

/** Message 2 — internal alert to the front desk. */
export function frontDeskAlertMessage(r: ReservationRecord): string {
  return [
    `*New reservation — awaiting transfer*`,
    `Guest: ${r.firstName} ${r.lastName}`,
    `WhatsApp: +${r.whatsappNumber ?? r.phone ?? "?"}`,
    `Reference: #${bookingRef(r.id)}`,
    `Expected amount: ${naira(amountDueNgn(r))}`,
    `Room: ${roomDisplayName(r.roomId)} · ${r.checkIn} → ${r.checkOut}`,
    `First check the credit on the Moniepoint POS. Only when the money has arrived, tap to confirm:`,
    buildConfirmPaymentUrl(r.id) ?? `(confirm link unavailable — mark it paid in the staff portal)`,
  ].join("\n");
}

export function paymentConfirmedMessage(r: ReservationRecord): string {
  return `Payment confirmed! Your reservation #${bookingRef(r.id)} for ${roomDisplayName(r.roomId)} is fully confirmed. We look forward to welcoming you!`;
}

/** One-tap replies the desk can send from the ops board (wa.me links). */
export function quickReplies(r: ReservationRecord, account: TransferAccount | null): { id: string; text: string }[] {
  const ref = bookingRef(r.id);
  const due = naira(amountDueNgn(r));
  return [
    { id: "confirmed", text: paymentConfirmedMessage(r) },
    {
      id: "notFound",
      text: `Hello ${r.firstName}, we haven't seen your ${due} transfer for reservation #${ref} yet. Banks can take a few minutes — please send a screenshot of your transfer receipt if you've already paid.`,
    },
    {
      id: "wrongAmount",
      text: `Hello ${r.firstName}, we received a transfer for reservation #${ref} but it doesn't match the amount due (${due}). Please send the balance or reply here and we'll help.`,
    },
    {
      id: "reminder",
      text: `Hello ${r.firstName}, a reminder that reservation #${ref} is awaiting payment of ${due}${account ? ` to ${account.bankName} ${account.accountNumber} (${account.accountName})` : ""}. Please include #${ref} in the transfer description.`,
    },
  ];
}

export type WhatsappJob = { to: string; body: string; referenceId: string; event: NotificationEvent };

/** Send now; queue for retry when the provider is unconfigured-but-expected or fails. */
export async function deliverWhatsapp(job: WhatsappJob, options: { fromOutbox?: boolean } = {}): Promise<boolean> {
  let ok = false;
  let error: string | undefined;
  try {
    ok = await sendGuestText(job.to, job.body, "whatsapp");
    if (!ok) error = "WhatsApp provider rejected or is not configured";
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  await logNotificationAttempt({
    event: job.event,
    referenceId: job.referenceId,
    channel: "whatsapp",
    success: ok,
    provider: process.env.WHATSAPP_PROVIDER ?? "termii",
    errorMessage: ok ? undefined : error,
  });
  if (!ok) {
    log.warning("WhatsApp not sent", { event: job.event, reference_id: job.referenceId, error });
    if (!options.fromOutbox && process.env.NOTIFY_CHANNEL !== "console") {
      await enqueueNotification("whatsapp", job as unknown as Record<string, unknown>, error);
    }
  }
  return ok;
}

/** Booking created with "pay by transfer": instructions to the guest, alert to the desk. */
export async function sendTransferNotifications(r: ReservationRecord): Promise<{ guest: boolean; desk: boolean }> {
  const account = transferAccount();
  if (!account) {
    log.error("TRANSFER_ACCOUNT_NUMBER / TRANSFER_ACCOUNT_NAME not set; no payment instructions sent", { reference_id: r.id });
  }
  const guestTo = r.whatsappNumber ?? null;
  const deskTo = frontDeskNumber();
  const [guest, desk] = await Promise.all([
    account && guestTo
      ? deliverWhatsapp({ to: guestTo, body: guestTransferMessage(r, account), referenceId: r.id, event: "transfer.instructions" })
      : false,
    deskTo
      ? deliverWhatsapp({ to: deskTo, body: frontDeskAlertMessage(r), referenceId: r.id, event: "transfer.desk_alert" })
      : false,
  ]);
  return { guest, desk };
}

export async function sendPaymentConfirmedWhatsapp(r: ReservationRecord): Promise<boolean> {
  if (!r.whatsappNumber) return false;
  return deliverWhatsapp({
    to: r.whatsappNumber,
    body: paymentConfirmedMessage(r),
    referenceId: r.id,
    event: "transfer.confirmed",
  });
}
