/** Pre-seeded records shown in the demo dashboard before live submissions */

import { generateDemoSeeds } from "@/content/demo-seed-generator";
import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";

const generated = generateDemoSeeds();

export const demoReservations: ReservationRecord[] = generated.reservations;

export const demoPayments: PaymentRecord[] = generated.payments;

export const demoReviews = [
  {
    id: "rev-1",
    author: "Chidi O.",
    location: "Lagos, Nigeria",
    rating: 5,
    text: "Impeccable service from arrival to checkout. The presidential suite views over Calabar are stunning.",
    date: "April 2026",
    /** Guest photo when available; omit for initials avatar */
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&h=160&q=80",
  },
  {
    id: "rev-2",
    author: "Marie L.",
    location: "Paris, France",
    rating: 5,
    text: "A perfect blend of African warmth and five-star refinement. Concierge arranged our Tinapa day flawlessly.",
    date: "March 2026",
    image: null,
  },
  {
    id: "rev-3",
    author: "Amina K.",
    location: "Abuja, Nigeria",
    rating: 5,
    text: "Rooftop dining and spa rituals made our anniversary unforgettable. Already booked our return visit.",
    date: "May 2026",
    image:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&h=160&q=80",
  },
] as const;
