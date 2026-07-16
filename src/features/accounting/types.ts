// Thin local types mirroring the API contract exposed by GET /api/demo/activity.
// Kept independent from other agents' files (same rationale as
// `@/features/cashier/types`) so this feature compiles even if those files change.

/** Mirrors the payment fields exposed by GET /api/demo/activity. */
export type AccountingPayment = {
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
  paymentChannel?: string;
  source: string;
  createdAt: string;
};

export type AccountingActivityResponse = {
  ok?: boolean;
  payments: AccountingPayment[];
};

/** Distinguishes "route not deployed on this branch yet" from other failures. */
export type AccountingApiError = {
  ok: false;
  notDeployed?: boolean;
  unauthorized?: boolean;
  error: string;
};
