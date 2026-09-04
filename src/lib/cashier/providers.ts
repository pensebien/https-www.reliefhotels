import { sendBankTransferApprovalNotifications } from "@/lib/bank-transfer";
import type { ReservationRecord } from "@/lib/demo-store";
import { pushTerminalPayment, pushTransferPayment } from "@/lib/moniepoint";
import { createPaystackTerminalSettlement } from "@/lib/paystack-terminal";
import type {
  CashierPaymentMethod,
  CashierProviderResult,
} from "@/lib/cashier/types";

export type CashierProviderInput = {
  reference: string;
  amountKobo: number;
  reservation: ReservationRecord;
  note?: string;
};

export interface CashierProvider {
  method: CashierPaymentMethod;
  execute(input: CashierProviderInput): Promise<CashierProviderResult>;
}

const cashProvider: CashierProvider = {
  method: "cash",
  async execute() {
    return { status: "success" };
  },
};

const moniepointTerminalProvider: CashierProvider = {
  method: "moniepoint_terminal",
  async execute({ amountKobo, reference }) {
    const push = await pushTerminalPayment({
      amountKobo,
      merchantReference: reference,
      paymentMethod: "ANY",
    });
    return { status: "pending", demo: push.demo };
  },
};

const moniepointTransferProvider: CashierProvider = {
  method: "moniepoint_transfer",
  async execute({ amountKobo, reference }) {
    const push = await pushTransferPayment({ amountKobo, merchantReference: reference });
    return { status: "pending", demo: push.demo };
  },
};

const paystackTerminalProvider: CashierProvider = {
  method: "paystack_terminal",
  async execute({ amountKobo, reference, reservation }) {
    const name = `${reservation.firstName} ${reservation.lastName}`.trim();
    return createPaystackTerminalSettlement({
      email: reservation.email,
      name,
      amountKobo,
      reference,
      description: `Relief Hotels — ${reservation.roomId ?? "stay"} settle`,
    });
  },
};

/**
 * No gateway involved at all — the guest transfers directly into the hotel's
 * own bank account (arranged over WhatsApp), so there's nothing to push to.
 * Just alerts the manager to go verify the transfer and approve it (dashboard
 * button or emailed link) — nothing here marks the payment successful.
 */
const bankTransferManualProvider: CashierProvider = {
  method: "bank_transfer_manual",
  async execute({ reference, amountKobo, reservation }) {
    await sendBankTransferApprovalNotifications({
      reference,
      reservation,
      amountKobo,
      itemLabel: `${reservation.roomId ?? reservation.itemType} — bank transfer settle (manual)`,
    });
    return { status: "pending" };
  },
};

const providers: Record<CashierPaymentMethod, CashierProvider> = {
  cash: cashProvider,
  moniepoint_terminal: moniepointTerminalProvider,
  moniepoint_transfer: moniepointTransferProvider,
  paystack_terminal: paystackTerminalProvider,
  bank_transfer_manual: bankTransferManualProvider,
};

export function getCashierProvider(method: CashierPaymentMethod): CashierProvider {
  return providers[method];
}
