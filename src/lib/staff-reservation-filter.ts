import {
  reservationMatchesSearch,
  type SearchableReservation,
} from "@/lib/dashboard-search";

export const STAFF_RESERVATION_PAGE_SIZE = 12;

export type StaffSearchableGuest = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  paymentReference?: string;
  stayPreference?: string;
  roomId?: string;
  status: string;
  source?: string;
};

export function toSearchableReservation(
  reservation: StaffSearchableGuest,
): SearchableReservation {
  return {
    id: reservation.id,
    firstName: reservation.firstName,
    lastName: reservation.lastName,
    email: reservation.email,
    phone: reservation.phone,
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    paymentReference: reservation.paymentReference,
    stayPreference: reservation.stayPreference ?? "",
    roomId: reservation.roomId,
    status: reservation.status,
    source: reservation.source ?? "",
  };
}

export function filterStaffReservationsByQuery<T extends StaffSearchableGuest>(
  reservations: T[],
  query: string,
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return reservations;
  return reservations.filter((reservation) =>
    reservationMatchesSearch(toSearchableReservation(reservation), trimmed),
  );
}

export function paginateStaffReservations<T>(
  reservations: T[],
  page: number,
  pageSize: number = STAFF_RESERVATION_PAGE_SIZE,
): { items: T[]; totalPages: number; page: number } {
  const totalPages = Math.max(1, Math.ceil(reservations.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: reservations.slice(start, start + pageSize),
    totalPages,
    page: safePage,
  };
}
