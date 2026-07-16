import { randomBytes } from "crypto";
import type { CashierPaymentMethod } from "@/lib/cashier/types";

const REFERENCE_PREFIX: Record<CashierPaymentMethod, string> = {
  cash: "RH-CASH",
  paystack_terminal: "RH-PSTM",
  moniepoint_terminal: "RH-MPOS",
  moniepoint_transfer: "RH-MPTF",
};

/** Mirrors `frontDeskPaymentReference` (staff-payment.ts) but also covers Paystack Terminal. */
export function cashierPaymentReference(method: CashierPaymentMethod): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex");
  return `${REFERENCE_PREFIX[method]}-${date}-${suffix}`;
}
