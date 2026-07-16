// Thin local types for the dedicated staff occupancy calendar page.
// The activity payload mirrors GET /api/demo/activity (src/app/api/demo/activity/route.ts)
// and is compatible with CalendarReservation / EventInquiry from src/lib/inventory-calendar.ts
// and src/lib/inquiry-store.ts, which we import directly rather than re-declaring.
import type { CalendarReservation } from "@/lib/inventory-calendar";
import type { EventInquiry } from "@/lib/inquiry-store";

export type { CalendarReservation, EventInquiry };

/** Mirrors the payment fields exposed by GET /api/demo/activity. */
export type StaffCalendarPayment = {
  id: string;
  reference: string;
  reservationId?: string;
  amountKobo: number;
  status: string;
  createdAt: string;
};

export type StaffCalendarActivityResponse = {
  ok?: boolean;
  reservations: CalendarReservation[];
  payments: StaffCalendarPayment[];
  eventInquiries?: EventInquiry[];
};

/** Distinguishes "unauthorized key" from other failures. */
export type StaffCalendarApiError = {
  ok: false;
  unauthorized?: boolean;
  error: string;
};

export type StaffCalendarResult<T> = T | StaffCalendarApiError;
