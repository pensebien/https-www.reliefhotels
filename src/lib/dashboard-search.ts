export type SearchScope = "both" | "reservations" | "payments";

export type SearchableReservation = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  paymentReference?: string;
  stayPreference: string;
  roomId?: string;
  status: string;
  source: string;
};

export type SearchablePayment = {
  id: string;
  reference: string;
  reservationId?: string;
  email: string;
  amountKobo: number;
  itemLabel: string;
  itemId?: string;
  status: string;
  source: string;
};

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function includesQuery(haystack: string, query: string): boolean {
  return haystack.toLowerCase().includes(query);
}

export function reservationSearchHaystack(
  reservation: SearchableReservation,
): string {
  return [
    reservation.id,
    reservation.firstName,
    reservation.lastName,
    `${reservation.firstName} ${reservation.lastName}`,
    reservation.email,
    reservation.phone,
    reservation.checkIn,
    reservation.checkOut,
    reservation.paymentReference,
    reservation.stayPreference,
    reservation.roomId,
    reservation.status,
    reservation.source,
  ]
    .filter(Boolean)
    .join(" ");
}

export function paymentSearchHaystack(payment: SearchablePayment): string {
  const amountNaira = payment.amountKobo / 100;
  return [
    payment.id,
    payment.reference,
    payment.reservationId,
    payment.email,
    payment.itemLabel,
    payment.itemId,
    payment.status,
    payment.source,
    String(amountNaira),
    String(payment.amountKobo),
  ]
    .filter(Boolean)
    .join(" ");
}

export function reservationMatchesSearch(
  reservation: SearchableReservation,
  query: string,
): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;
  return includesQuery(reservationSearchHaystack(reservation), normalized);
}

export function paymentMatchesSearch(
  payment: SearchablePayment,
  query: string,
): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;
  return includesQuery(paymentSearchHaystack(payment), normalized);
}

export function filterReservationsBySearch<T extends SearchableReservation>(
  reservations: T[],
  paymentsByReservation: Map<string, SearchablePayment[]>,
  query: string,
  scope: SearchScope,
): T[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized || scope === "payments") return reservations;

  return reservations.filter((reservation) => {
    if (reservationMatchesSearch(reservation, normalized)) return true;
    if (scope !== "both") return false;
    const linked = paymentsByReservation.get(reservation.id) ?? [];
    return linked.some((payment) => paymentMatchesSearch(payment, normalized));
  });
}

export function filterPaymentsBySearch<T extends SearchablePayment>(
  payments: T[],
  reservationsById: Map<string, SearchableReservation>,
  query: string,
  scope: SearchScope,
): T[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized || scope === "reservations") return payments;

  return payments.filter((payment) => {
    if (paymentMatchesSearch(payment, normalized)) return true;
    if (scope !== "both" || !payment.reservationId) return false;
    const reservation = reservationsById.get(payment.reservationId);
    return reservation
      ? reservationMatchesSearch(reservation, normalized)
      : false;
  });
}
