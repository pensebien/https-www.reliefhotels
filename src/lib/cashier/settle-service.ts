import {
  addPayment,
  findPaymentByReference,
  findReservationById,
  updatePaymentByReference,
  updateReservationById,
} from "@/lib/demo-store";
import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";
import { handlePaymentConfirmed } from "@/lib/payment-confirmed";
import { syncMoniepointPushPayment } from "@/lib/moniepoint-sync";
import { syncPaystackTerminalPayment } from "@/lib/paystack-terminal";
import { cashierPaymentReference } from "@/lib/cashier/reference";
import { getCashierProvider } from "@/lib/cashier/providers";
import { findReferenceForMutation, recordMutation } from "@/lib/cashier/store";
import {
  fromStoredPaymentMethod,
  paymentChannelForCashierMethod,
  toStoredPaymentMethod,
  type CashierPaymentMethod,
  type CashierSettleResult,
} from "@/lib/cashier/types";
import type { CashierSettleInput } from "@/lib/schemas/cashier-settle";

const METHOD_LABEL: Record<CashierPaymentMethod, string> = {
  cash: "cash settle",
  paystack_terminal: "Paystack Terminal settle",
  moniepoint_terminal: "Moniepoint terminal settle",
  moniepoint_transfer: "Moniepoint transfer settle",
  bank_transfer_manual: "bank transfer settle (manual)",
};

function resolveItemType(reservation: ReservationRecord): "room" | "tour" {
  return reservation.itemType === "tour" ? "tour" : "room";
}

function buildItemLabel(
  reservation: ReservationRecord,
  method: CashierPaymentMethod,
): string {
  const target = reservation.roomId ?? reservation.itemType;
  return `${target} — ${METHOD_LABEL[method]}`;
}

async function replayFromMutation(
  clientMutationId: string,
  fallbackMethod: CashierPaymentMethod,
): Promise<CashierSettleResult | null> {
  const existingReference = await findReferenceForMutation(clientMutationId);
  if (!existingReference) return null;

  const payment = await findPaymentByReference(existingReference);
  if (!payment) return null;

  const reservation = payment.reservationId
    ? await findReservationById(payment.reservationId)
    : undefined;

  return {
    ok: true,
    paymentId: payment.id,
    reference: payment.reference,
    status: payment.status === "abandoned" ? "failed" : payment.status,
    provider: fromStoredPaymentMethod(payment.paymentMethod) ?? fallbackMethod,
    reservation: reservation ?? ({ id: payment.reservationId ?? "" } as ReservationRecord),
    payment,
    idempotentReplay: true,
  };
}

export async function settleCashierPayment(
  input: CashierSettleInput,
): Promise<CashierSettleResult> {
  const replay = await replayFromMutation(input.clientMutationId, input.paymentMethod);
  if (replay) return replay;

  const reservation = await findReservationById(input.reservationId);
  if (!reservation) {
    return { ok: false, error: "Reservation not found", status: 404 };
  }

  const method = input.paymentMethod;
  const reference = cashierPaymentReference(method);
  const amountKobo = input.amountNgn * 100;

  let payment = await addPayment({
    reference,
    reservationId: reservation.id,
    email: reservation.email,
    amountKobo,
    currency: "NGN",
    status: method === "cash" ? "success" : "pending",
    itemType: resolveItemType(reservation),
    itemId: reservation.roomId ?? reservation.id,
    itemLabel: buildItemLabel(reservation, method),
    paymentMethod: toStoredPaymentMethod(method),
    paymentChannel: paymentChannelForCashierMethod(method),
  });

  let demo: boolean | undefined;

  if (method !== "cash") {
    const provider = getCashierProvider(method);

    try {
      const result = await provider.execute({
        reference,
        amountKobo,
        reservation,
        note: input.note,
      });

      demo = result.demo;

      const patch: Partial<PaymentRecord> = {};
      if (result.status !== payment.status) patch.status = result.status;
      if (result.externalReference) patch.externalReference = result.externalReference;

      if (Object.keys(patch).length > 0) {
        const updated = await updatePaymentByReference(reference, patch);
        if (updated) payment = updated;
      }
    } catch (error) {
      await updatePaymentByReference(reference, { status: "failed" });
      const message =
        error instanceof Error ? error.message : "Provider settle failed";
      return { ok: false, error: message, status: 502 };
    }
  }

  let updatedReservation = reservation;

  if (payment.status === "success") {
    const patch: Partial<ReservationRecord> = {
      status: "confirmed",
      paymentReference: reference,
    };
    if (input.note) patch.staffNotes = input.note;
    const updated = await updateReservationById(reservation.id, patch);
    if (updated) {
      updatedReservation = updated;
      await handlePaymentConfirmed(payment, updated);
    }
  } else if (input.note) {
    const updated = await updateReservationById(reservation.id, {
      staffNotes: input.note,
    });
    if (updated) updatedReservation = updated;
  }

  await recordMutation(input.clientMutationId, reference);

  return {
    ok: true,
    paymentId: payment.id,
    reference,
    status: payment.status === "abandoned" ? "failed" : payment.status,
    provider: method,
    demo,
    reservation: updatedReservation,
    payment,
  };
}

export type CashierSettleStatusResult = {
  payment: PaymentRecord;
  reservation?: ReservationRecord;
  status: PaymentRecord["status"];
};

export async function getCashierSettleStatus(
  reference: string,
  options: { demoOverride?: boolean } = {},
): Promise<CashierSettleStatusResult | null> {
  const payment = await findPaymentByReference(reference);
  if (!payment) return null;

  let finalPayment = payment;
  const method = fromStoredPaymentMethod(payment.paymentMethod);

  if (payment.status === "pending" && method) {
    if (method === "moniepoint_terminal" || method === "moniepoint_transfer") {
      const sync = await syncMoniepointPushPayment(reference);
      if ("payment" in sync && sync.payment) finalPayment = sync.payment;
    } else if (method === "paystack_terminal") {
      const synced = await syncPaystackTerminalPayment(
        reference,
        options.demoOverride,
      );
      if (synced) finalPayment = synced;
    }
  }

  let reservation: ReservationRecord | undefined;
  if (finalPayment.reservationId) {
    reservation = await findReservationById(finalPayment.reservationId);
    if (
      finalPayment.status === "success" &&
      reservation &&
      reservation.status !== "confirmed"
    ) {
      const updated = await updateReservationById(finalPayment.reservationId, {
        status: "confirmed",
        paymentReference: reference,
      });
      if (updated) {
        reservation = updated;
        await handlePaymentConfirmed(finalPayment, updated);
      }
    }
  }

  return { payment: finalPayment, reservation, status: finalPayment.status };
}
