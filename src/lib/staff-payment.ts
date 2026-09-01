import type { FrontDeskPaymentMethod } from "@/lib/payment-methods";
import { randomBytes } from "crypto";

export function frontDeskPaymentReference(
  method: FrontDeskPaymentMethod,
): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex");
  const prefix =
    method === "cash"
      ? "RH-CASH"
      : method === "moniepoint_terminal"
        ? "RH-MPOS"
        : method === "paystack_terminal"
          ? "RH-PSPOS"
          : "RH-MPTF";
  return `${prefix}-${date}-${suffix}`;
}

export function paymentItemLabel(
  roomId: string,
  method: FrontDeskPaymentMethod,
): string {
  const suffix =
    method === "cash"
      ? "cash deposit"
      : method === "moniepoint_terminal"
        ? "Moniepoint terminal deposit"
        : method === "paystack_terminal"
          ? "Paystack terminal deposit"
          : "Moniepoint transfer deposit";
  return `${roomId} — ${suffix}`;
}
