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

const providers: Record<CashierPaymentMethod, CashierProvider> = {
  cash: cashProvider,
  moniepoint_terminal: moniepointTerminalProvider,
  moniepoint_transfer: moniepointTransferProvider,
  paystack_terminal: paystackTerminalProvider,
};

export function getCashierProvider(method: CashierPaymentMethod): CashierProvider {
  return providers[method];
}
