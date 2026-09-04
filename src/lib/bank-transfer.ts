import { createBankTransferApprovalToken } from "@/lib/bank-transfer-link";
import { getServerConfig } from "@/lib/config";
import type { ReservationRecord } from "@/lib/demo-store";
import { sendBankTransferApprovalEmail } from "@/lib/email";
import { notifyManager } from "@/lib/notifications";

function getBankTransferEnv() {
  return {
    bankName: process.env.BANK_TRANSFER_ACCOUNT_BANK_NAME ?? "",
    accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME ?? "",
    accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER ?? "",
    approvalEmail: process.env.BANK_TRANSFER_APPROVAL_EMAIL ?? "",
    linkSecretSet: Boolean(process.env.BANK_TRANSFER_LINK_SECRET?.trim()),
  };
}

export function getBankTransferPublicConfig() {
  const env = getBankTransferEnv();
  return {
    /** Whether the emailed-approval-link half of this method can work at all. */
    configured: Boolean(env.approvalEmail && env.linkSecretSet),
    account:
      env.accountNumber && env.accountName
        ? {
            bankName: env.bankName || "Bank",
            accountNumber: env.accountNumber,
            accountName: env.accountName,
          }
        : null,
  };
}

/**
 * Fires the moment a `bank_transfer_manual` payment is recorded pending:
 * emails a signed approval link to the fixed, trusted manager address, and
 * alerts the manager via SMS/WhatsApp that a guest *claims* they paid — an
 * unverified claim, distinct from `notifyManager`'s "payment.verified" event.
 * Never throws — both underlying calls already swallow their own failures,
 * matching the rest of this codebase's non-blocking notification contract.
 */
export async function sendBankTransferApprovalNotifications(input: {
  reference: string;
  reservation: ReservationRecord;
  amountKobo: number;
  itemLabel: string;
}): Promise<void> {
  const env = getBankTransferEnv();
  const token = createBankTransferApprovalToken(input.reference);
  const appUrl = getServerConfig().appUrl;
  const approvalUrl = token ? `${appUrl}/bank-transfer-approve/${token}` : undefined;

  await sendBankTransferApprovalEmail({
    to: env.approvalEmail,
    reference: input.reference,
    guestName: `${input.reservation.firstName} ${input.reservation.lastName}`,
    amountKobo: input.amountKobo,
    itemLabel: input.itemLabel,
    approvalUrl,
  });

  const amountNgn = Math.round(input.amountKobo / 100);
  await notifyManager({
    event: "payment.awaiting_manual_review",
    referenceId: input.reference,
    guestName: `${input.reservation.firstName} ${input.reservation.lastName}`,
    phone: input.reservation.phone,
    summary: `₦${amountNgn.toLocaleString("en-NG")} deposit — ${input.itemLabel}`,
  });
}
