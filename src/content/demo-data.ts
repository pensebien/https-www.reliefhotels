/** Pre-seeded records shown in the demo dashboard before live submissions */

import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";

export const demoReservations: ReservationRecord[] = [
  {
    id: "demo-res-001",
    firstName: "Adaeze",
    lastName: "Okonkwo",
    email: "adaeze.okonkwo@example.com",
    stayPreference: "presidential-suite",
    message:
      "Anniversary weekend, 14–16 June. Late check-in ~9pm. Champagne on arrival if possible.",
    status: "confirmed",
    source: "demo",
    createdAt: "2026-05-28T09:15:00.000Z",
    emailSent: true,
  },
  {
    id: "demo-res-002",
    firstName: "James",
    lastName: "Mbeki",
    email: "j.mbeki@example.com",
    stayPreference: "executive-room",
    message: "Business stay Mon–Thu. Need quiet room + early breakfast 6:30am.",
    status: "pending",
    source: "demo",
    createdAt: "2026-05-29T14:22:00.000Z",
    emailSent: true,
  },
  {
    id: "demo-res-003",
    firstName: "Fatima",
    lastName: "Bello",
    email: "fatima.bello@example.com",
    stayPreference: "signature-suite",
    message: "Family of 3 — connecting preference. Calabar heritage tour on day 2.",
    status: "pending",
    source: "demo",
    createdAt: "2026-05-29T18:40:00.000Z",
    emailSent: false,
  },
];

export const demoPayments: PaymentRecord[] = [
  {
    id: "demo-pay-001",
    reference: "RH-DEMO-20260528-001",
    email: "adaeze.okonkwo@example.com",
    amountKobo: 8400000,
    currency: "NGN",
    status: "success",
    itemType: "room",
    itemId: "presidential-suite",
    itemLabel: "Presidential Suite — 2 nights deposit (20%)",
    source: "demo",
    createdAt: "2026-05-28T09:20:00.000Z",
  },
  {
    id: "demo-pay-002",
    reference: "RH-DEMO-20260529-002",
    email: "j.mbeki@example.com",
    amountKobo: 2500000,
    currency: "NGN",
    status: "success",
    itemType: "tour",
    itemId: "calabar-heritage",
    itemLabel: "Calabar Heritage Walk × 2 guests",
    source: "demo",
    createdAt: "2026-05-29T14:30:00.000Z",
  },
  {
    id: "demo-pay-003",
    reference: "RH-DEMO-20260529-003",
    email: "visitor@example.com",
    amountKobo: 500000,
    currency: "NGN",
    status: "abandoned",
    itemType: "room",
    itemId: "signature-suite",
    itemLabel: "Suite — test deposit",
    source: "demo",
    createdAt: "2026-05-29T11:05:00.000Z",
  },
];

export const demoReviews = [
  {
    id: "rev-1",
    author: "Chidi O.",
    location: "Lagos, Nigeria",
    rating: 5,
    text: "Impeccable service from arrival to checkout. The presidential suite views over Calabar are stunning.",
    date: "April 2026",
  },
  {
    id: "rev-2",
    author: "Marie L.",
    location: "Paris, France",
    rating: 5,
    text: "A perfect blend of African warmth and five-star refinement. Concierge arranged our Tinapa day flawlessly.",
    date: "March 2026",
  },
  {
    id: "rev-3",
    author: "Amina K.",
    location: "Abuja, Nigeria",
    rating: 5,
    text: "Rooftop dining and spa rituals made our anniversary unforgettable. Already booked our return visit.",
    date: "May 2026",
  },
];
