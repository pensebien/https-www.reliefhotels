/** How a front-desk / in-person deposit was collected. */
export type FrontDeskPaymentMethod =
  | "cash"
  | "moniepoint_terminal"
  | "moniepoint_transfer";

export type PaymentChannel = "paystack" | "moniepoint" | "cash";

export const FRONT_DESK_PAYMENT_METHODS = [
  "cash",
  "moniepoint_terminal",
  "moniepoint_transfer",
] as const satisfies readonly FrontDeskPaymentMethod[];

export type StaffPaymentOption = "none" | FrontDeskPaymentMethod;

export function paymentChannelForMethod(
  method: FrontDeskPaymentMethod,
): PaymentChannel {
  if (method === "cash") return "cash";
  return "moniepoint";
}

export function paymentMethodLabelKey(
  method: FrontDeskPaymentMethod | "paystack" | undefined,
): string {
  switch (method) {
    case "cash":
      return "createReservation.paymentMethods.cash";
    case "moniepoint_terminal":
      return "createReservation.paymentMethods.moniepointTerminal";
    case "moniepoint_transfer":
      return "createReservation.paymentMethods.moniepointTransfer";
    case "paystack":
      return "createReservation.paymentMethods.paystack";
    default:
      return "createReservation.paymentMethods.unknown";
  }
}
