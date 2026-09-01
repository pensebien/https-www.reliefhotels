/** How a front-desk / in-person deposit was collected. */
export type FrontDeskPaymentMethod =
  | "cash"
  | "moniepoint_terminal"
  | "moniepoint_transfer"
  | "paystack_terminal";

export type PaymentChannel = "paystack" | "moniepoint" | "cash";

export const FRONT_DESK_PAYMENT_METHODS = [
  "cash",
  "moniepoint_terminal",
  "moniepoint_transfer",
  "paystack_terminal",
] as const satisfies readonly FrontDeskPaymentMethod[];

export type StaffPaymentOption = "none" | FrontDeskPaymentMethod;

/** Front-desk "Card" groups both terminal providers under one UI option (ADR-005 dual POS). */
export type CardTerminalMethod = "paystack_terminal" | "moniepoint_terminal";

/**
 * Resolve which terminal provider the "Card" option pushes to when staff
 * haven't been given an explicit choice: prefer whichever single provider
 * is configured; if both (or neither) are configured, default to Moniepoint
 * — the provider the front desk has used historically.
 */
export function resolveCardTerminalMethod(config: {
  paystackTerminalConfigured: boolean;
  moniepointTerminalConfigured: boolean;
}): CardTerminalMethod {
  if (config.paystackTerminalConfigured && !config.moniepointTerminalConfigured) {
    return "paystack_terminal";
  }
  return "moniepoint_terminal";
}

export function paymentChannelForMethod(
  method: FrontDeskPaymentMethod,
): PaymentChannel {
  if (method === "cash") return "cash";
  if (method === "paystack_terminal") return "paystack";
  return "moniepoint";
}

export function paymentMethodLabelKey(
  method: FrontDeskPaymentMethod | "paystack" | undefined,
): string {
  switch (method) {
    case "cash":
      return "createReservation.paymentMethods.cash";
    case "moniepoint_terminal":
      return "createReservation.paymentMethods.moniepoint_terminal";
    case "moniepoint_transfer":
      return "createReservation.paymentMethods.moniepoint_transfer";
    case "paystack_terminal":
      return "createReservation.paymentMethods.paystack_terminal";
    case "paystack":
      return "createReservation.paymentMethods.paystack";
    default:
      return "createReservation.paymentMethods.unknown";
  }
}
