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
  forbidden?: boolean;
  error: string;
};

export type ReconcileDiscrepancyType =
  | "amount_mismatch"
  | "status_mismatch"
  | "missing_on_paystack"
  | "missing_locally";

export type ReconcileDiscrepancy = {
  reference: string;
  type: ReconcileDiscrepancyType;
  localAmountKobo?: number;
  paystackAmountKobo?: number;
  localStatus?: string;
  paystackStatus?: string;
};

export type ReconcileResponse = {
  ok?: boolean;
  demo: boolean;
  range: { from: string; to: string };
  checkedLocalCount: number;
  checkedRemoteCount: number;
  discrepancies: ReconcileDiscrepancy[];
};
