// Thin local types for the staff F&B / minibar folio UI (Agent K), kept
// independent from other agents' feature folders — mirrors the fields this
// UI actually consumes from GET /api/demo/activity and the folio API.

export type FnbReservationStatus = "pending" | "confirmed" | "cancelled";

/** Subset of the reservation fields exposed by GET /api/demo/activity. */
export type FnbReservation = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  guests: number;
  status: FnbReservationStatus;
  createdAt: string;
  /** Optional fields used for staff search. */
  roomId?: string;
  stayPreference?: string;
  paymentReference?: string;
  source?: string;
};

export type FnbActivityResponse = {
  ok?: boolean;
  reservations: FnbReservation[];
};

export type FolioChargeStatus = "open" | "posted" | "paid" | "void";

export type FolioCharge = {
  id: string;
  reservationId: string;
  sku: string;
  name: string;
  qty: number;
  unitPriceNgn: number;
  status: FolioChargeStatus;
  createdAt: string;
  paidAt?: string;
};

export type FolioChargesResponse = {
  ok?: boolean;
  charges: FolioCharge[];
};

export type CreateFolioChargeResponse = {
  ok?: boolean;
  charge: FolioCharge;
};

/** Distinguishes "route not deployed on this branch yet" from other failures. */
export type FnbApiError = {
  ok: false;
  notDeployed?: boolean;
  unauthorized?: boolean;
  error: string;
};
