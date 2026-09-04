import { BankTransferApproveClient } from "@/components/staff/bank-transfer-approve-client";
import { verifyBankTransferApprovalToken } from "@/lib/bank-transfer-link";
import { findPaymentByReference, findReservationById } from "@/lib/demo-store";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

export function generateMetadata(): Metadata {
  return {
    title: "Approve bank transfer | Relief Hotels & Suites",
    robots: { index: false, follow: false },
  };
}

/**
 * Standalone, deliberately outside `/staff/*` — `StaffShell` force-redirects
 * unauthenticated visits to `/staff/login` with no way back to this token,
 * so nesting this page under the staff shell would lose the link on an
 * unauthenticated click. This page keeps the token in scope the whole time
 * and does its own lightweight auth check on the approve action itself.
 */
export default async function BankTransferApprovePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const decoded = verifyBankTransferApprovalToken(token);
  const payment = decoded ? await findPaymentByReference(decoded.reference) : null;
  const validMethod = payment?.paymentMethod === "bank_transfer_manual";
  const reservation =
    validMethod && payment?.reservationId
      ? await findReservationById(payment.reservationId)
      : undefined;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      {!decoded || !payment || !validMethod ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="font-medium">This link is invalid or has expired.</p>
          <p className="mt-2 text-sm text-muted">
            Approve this payment from the staff dashboard instead.
          </p>
        </div>
      ) : (
        <BankTransferApproveClient
          token={token}
          reference={payment.reference}
          guestName={
            reservation ? `${reservation.firstName} ${reservation.lastName}` : undefined
          }
          amountKobo={payment.amountKobo}
          itemLabel={payment.itemLabel}
          status={payment.status}
        />
      )}
    </div>
  );
}
