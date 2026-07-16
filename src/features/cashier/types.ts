// Thin local types mirroring the API contract in docs/contracts/api-v1.md
// (Staff cashier settle, ADR-005). Kept independent from other agents' files
// so this feature can compile against the contract even before their routes ship.

export type CashierPaymentMethod =
  | "cash"
  | "paystack_terminal"
  | "moniepoint_terminal"
  | "moniepoint_transfer";

export type CashierReservationStatus = "pending" | "confirmed" | "cancelled";

/** Mirrors the reservation fields exposed by GET /api/demo/activity. */
export type CashierReservation = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  guests: number;
  itemType?: "room" | "tour" | "inquiry";
  roomId?: string;
  stayPreference: string;
  status: CashierReservationStatus;
  paymentReference?: string;
  staffNotes?: string;
  source: string;
  createdAt: string;
};

/** Mirrors the payment fields exposed by GET /api/demo/activity. */
export type CashierPayment = {
  id: string;
  reference: string;
  reservationId?: string;
  email: string;
  amountKobo: number;
  status: string;
  itemType?: "room" | "tour";
  itemId?: string;
  itemLabel?: string;
  paymentMethod?: string;
  source: string;
  createdAt: string;
};

export type CashierActivityResponse = {
  ok?: boolean;
  reservations: CashierReservation[];
  payments: CashierPayment[];
};

export type CashierSettleRequest = {
  reservationId: string;
  amountNgn: number;
  paymentMethod: CashierPaymentMethod;
  clientMutationId: string;
  note?: string;
};

export type CashierSettleStatus = "success" | "pending" | "failed";

export type CashierSettleResponse = {
  ok: boolean;
  paymentId?: string;
  reference?: string;
  status?: CashierSettleStatus;
  provider?: string;
  demo?: boolean;
  error?: string;
};

export type CashierSettleStatusResponse = {
  ok: boolean;
  status?: CashierSettleStatus;
  reference?: string;
  paymentId?: string;
  reservationId?: string;
  error?: string;
};

/** Distinguishes "route not deployed on this branch yet" from other failures. */
export type CashierApiError = {
  ok: false;
  notDeployed?: boolean;
  unauthorized?: boolean;
  error: string;
};
