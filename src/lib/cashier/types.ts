import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";

/** ADR-005 — dual POS: Paystack Terminal joins the existing front-desk methods. */
export type CashierPaymentMethod =
  | "cash"
  | "paystack_terminal"
  | "moniepoint_terminal"
  | "moniepoint_transfer"
  | "bank_transfer_manual";

export const CASHIER_PAYMENT_METHODS = [
  "cash",
  "paystack_terminal",
  "moniepoint_terminal",
  "moniepoint_transfer",
  "bank_transfer_manual",
] as const satisfies readonly CashierPaymentMethod[];

export type CashierSettleStatus = "success" | "pending" | "failed";

export type CashierProviderResult = {
  status: CashierSettleStatus;
  demo?: boolean;
  externalReference?: string;
  offlineReference?: string;
  providerTerminalId?: string;
};

export type CashierSettleSuccess = {
  ok: true;
  paymentId: string;
  reference: string;
  status: CashierSettleStatus;
  provider: CashierPaymentMethod;
  demo?: boolean;
  reservation: ReservationRecord;
  payment: PaymentRecord;
  idempotentReplay?: boolean;
};

export type CashierSettleFailure = {
  ok: false;
  error: string;
  status: number;
};

export type CashierSettleResult = CashierSettleSuccess | CashierSettleFailure;

/**
 * `PaymentRecord.paymentMethod` predates the Paystack Terminal cashier method
 * (ADR-005). The JSON file store and the Supabase `payment_method` column both
 * persist arbitrary strings, so this cast is safe at runtime even though the
 * narrower union type doesn't (yet) list `paystack_terminal`.
 */
export function toStoredPaymentMethod(
  method: CashierPaymentMethod,
): PaymentRecord["paymentMethod"] {
  return method as unknown as PaymentRecord["paymentMethod"];
}

export function fromStoredPaymentMethod(
  value: PaymentRecord["paymentMethod"],
): CashierPaymentMethod | undefined {
  return (CASHIER_PAYMENT_METHODS as readonly string[]).includes(value ?? "")
    ? (value as CashierPaymentMethod)
    : undefined;
}

export function paymentChannelForCashierMethod(
  method: CashierPaymentMethod,
): "cash" | "moniepoint" | "paystack" | "bank_transfer_manual" {
  if (method === "cash") return "cash";
  if (method === "paystack_terminal") return "paystack";
  if (method === "bank_transfer_manual") return "bank_transfer_manual";
  return "moniepoint";
}
