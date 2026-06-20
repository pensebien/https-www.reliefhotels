/**
 * Generates 50+ demo reservations & payments for staff portal / dashboard previews.
 * Imported by demo-data.ts — not used in production booking flow.
 */

import { calculateDepositNgn } from "@/lib/booking-deposit";
import { stableDemoUuid } from "@/lib/demo-seed-id";
import { experienceOptions } from "@/content/experience-options";
import type { PaymentRecord, ReservationRecord } from "@/lib/demo-store";
import { rooms } from "@/content/site";

const FIRST_NAMES = [
  "Adaeze",
  "James",
  "Fatima",
  "Chidi",
  "Amina",
  "Emeka",
  "Ngozi",
  "Tunde",
  "Blessing",
  "Kofi",
  "Sarah",
  "Michael",
  "Chioma",
  "David",
  "Halima",
  "Peter",
  "Grace",
  "Samuel",
  "Zainab",
  "Victor",
  "Linda",
  "Ibrahim",
  "Rose",
  "Daniel",
  "Yewande",
  "Paul",
  "Mary",
  "Andrew",
  "Funke",
  "George",
];

const LAST_NAMES = [
  "Okonkwo",
  "Mbeki",
  "Bello",
  "Okafor",
  "Yusuf",
  "Adeyemi",
  "Eze",
  "Bakare",
  "Nwosu",
  "Mensah",
  "Johnson",
  "Ogunleye",
  "Diallo",
  "Williams",
  "Abubakar",
  "Edet",
  "Kalu",
  "Obi",
  "Sule",
  "Tamuno",
  "Akpan",
  "Garba",
  "Effiong",
  "Chukwu",
  "Ojo",
];

type SeedStatus = ReservationRecord["status"];

function pick<T>(arr: readonly T[], index: number): T {
  return arr[index % arr.length];
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function addDaysYmd(base: string, days: number): string {
  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

function isoCreated(dayOffset: number, hour: number): string {
  const base = new Date(2026, 5, 1 + (dayOffset % 28), hour, 15, 0, 0);
  return base.toISOString();
}

function statusForIndex(i: number): SeedStatus {
  if (i % 11 === 0) return "cancelled";
  if (i % 4 === 0) return "pending";
  return "confirmed";
}

function emailSentFor(status: SeedStatus, i: number): boolean {
  if (status === "cancelled") return i % 3 === 0;
  return i % 5 !== 0;
}

function paymentRef(seq: number): string {
  return `RH-DEMO-202606${pad2((seq % 28) + 1)}-${pad2(seq)}`;
}

function buildRoomSeeds(): {
  reservations: ReservationRecord[];
  payments: PaymentRecord[];
} {
  const reservations: ReservationRecord[] = [];
  const payments: PaymentRecord[] = [];
  let seq = 1;

  const roomPlan: Array<{ roomId: (typeof rooms)[number]["id"]; count: number }> = [
    { roomId: "guest-room", count: 10 },
    { roomId: "executive-room", count: 9 },
    { roomId: "executive-spa", count: 4 },
    { roomId: "signature-suite", count: 9 },
    { roomId: "presidential-suite", count: 8 },
  ];

  let globalIndex = 0;
  for (const { roomId, count } of roomPlan) {
    const room = rooms.find((r) => r.id === roomId)!;
    for (let j = 0; j < count; j++) {
      globalIndex++;
      const i = globalIndex;
      const firstName = pick(FIRST_NAMES, i + 3);
      const lastName = pick(LAST_NAMES, i + 7);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
      const nights = (i % 5) + 1;
      const guests = (i % 4) + 1;
      const checkIn = addDaysYmd("2026-06-05", i * 2);
      const checkOut = addDaysYmd(checkIn, nights);
      const status = statusForIndex(i);
      const ref = paymentRef(seq);
      const deposit = calculateDepositNgn(room.priceFrom, nights);

      let message = `Demo room booking — ${room.id}. ${status === "confirmed" ? "Deposit received." : status === "pending" ? "Awaiting deposit." : "Guest cancelled."}`;
      if (i % 3 === 0) {
        const interest = experienceOptions[i % experienceOptions.length]?.id;
        if (interest) {
          message = `Calabar experiences of interest (informational — concierge will advise, not charged online): ${interest}\n\n${message}`;
        }
      }

      const record: ReservationRecord = {
        id: stableDemoUuid(`res-${pad2(seq)}`),
        firstName,
        lastName,
        email,
        phone: `+23480${String(10000000 + i).slice(-8)}`,
        itemType: "room",
        roomId: room.id,
        checkIn,
        checkOut,
        nights,
        guests,
        stayPreference: `${room.id} · ${nights} night(s) · ${guests} guest(s)`,
        message,
        status,
        paymentReference: status === "confirmed" ? ref : undefined,
        source: "demo",
        createdAt: isoCreated(i, 8 + (i % 10)),
        emailSent: emailSentFor(status, i),
      };
      reservations.push(record);

      if (status === "confirmed") {
        payments.push({
          id: stableDemoUuid(`pay-${pad2(seq)}`),
          reference: ref,
          reservationId: record.id,
          email,
          amountKobo: deposit * 100,
          currency: "NGN",
          status: "success",
          itemType: "room",
          itemId: room.id,
          itemLabel: `${room.id} — ${nights} night(s) deposit (20%)`,
          source: "demo",
          createdAt: isoCreated(i, 9 + (i % 10)),
        });
      } else if (status === "pending" && i % 3 === 0) {
        payments.push({
          id: stableDemoUuid(`pay-${pad2(seq)}`),
          reference: ref,
          reservationId: record.id,
          email,
          amountKobo: deposit * 100,
          currency: "NGN",
          status: i % 2 === 0 ? "abandoned" : "failed",
          itemType: "room",
          itemId: room.id,
          itemLabel: `${room.id} — deposit attempt`,
          source: "demo",
          createdAt: isoCreated(i, 10 + (i % 10)),
        });
      }

      seq++;
    }
  }

  return { reservations, payments };
}

const EXPERIENCE_SEEDS = [
  {
    id: "carnival",
    label: "Calabar Carnival hosting",
    preference: "experience-carnival",
    message: "Carnival season VIP package — transport + priority dining.",
  },
  {
    id: "river-cruise",
    label: "River & marina evening",
    preference: "experience-river-cruise",
    message: "Sunset cruise and waterfront dinner for 6 guests.",
  },
  {
    id: "executive-hosting",
    label: "Executive diplomatic hosting",
    preference: "experience-executive-hosting",
    message: "Discrete arrival for delegation — 4 suites block.",
  },
  {
    id: "spa-day",
    label: "Spa & wellness amenity",
    preference: "amenity-spa-day",
    message: "Full-day spa ritual + healthy menu for couple.",
  },
  {
    id: "rooftop-dining",
    label: "Rooftop dining experience",
    preference: "amenity-rooftop-dining",
    message: "Private rooftop table — anniversary setup.",
  },
  {
    id: "conference",
    label: "Events & meetings",
    preference: "events-meetings",
    message: "Conference hall hire — 80 pax, AV + coffee breaks.",
  },
  {
    id: "fitness",
    label: "Fitness center amenity",
    preference: "amenity-fitness",
    message: "Personal trainer session + gym day pass bundle.",
  },
  {
    id: "pool",
    label: "Pool & leisure amenity",
    preference: "amenity-pool",
    message: "Family pool day with cabana — 4 guests.",
  },
  {
    id: "butler",
    label: "Butler service experience",
    preference: "experience-butler",
    message: "Butler-led city orientation for penthouse guests.",
  },
  {
    id: "culinary-class",
    label: "In-hotel culinary experience",
    preference: "experience-culinary",
    message: "Chef-led Calabar tasting menu — group of 8.",
  },
  {
    id: "airport-transfer",
    label: "VIP transfer amenity",
    preference: "amenity-airport-transfer",
    message: "Airport pickup + late checkout package.",
  },
] as const;

function buildExperienceSeeds(startSeq: number): {
  reservations: ReservationRecord[];
  nextSeq: number;
} {
  const reservations: ReservationRecord[] = [];
  let seq = startSeq;

  for (let round = 0; round < 2; round++) {
    for (let e = 0; e < EXPERIENCE_SEEDS.length; e++) {
      const exp = EXPERIENCE_SEEDS[e];
      const i = seq;
      const firstName = pick(FIRST_NAMES, i + 19);
      const lastName = pick(LAST_NAMES, i + 23);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.exp${seq}@example.com`;
      const eventDate = addDaysYmd("2026-07-01", seq + e * 2);
      const status = statusForIndex(i + e);

      reservations.push({
        id: stableDemoUuid(`res-${pad2(seq)}`),
        firstName,
        lastName,
        email,
        phone: `+23470${String(30000000 + seq).slice(-8)}`,
        itemType: "inquiry",
        checkIn: eventDate,
        guests: (seq % 6) + 2,
        stayPreference: exp.preference,
        message: `${exp.label}: ${exp.message}`,
        status,
        source: "demo",
        createdAt: isoCreated(seq, 14 + (seq % 6)),
        emailSent: emailSentFor(status, seq),
      });
      seq++;
    }
  }

  return { reservations, nextSeq: seq };
}

export function generateDemoSeeds(): {
  reservations: ReservationRecord[];
  payments: PaymentRecord[];
} {
  const room = buildRoomSeeds();
  const experience = buildExperienceSeeds(room.reservations.length + 1);

  return {
    reservations: [...room.reservations, ...experience.reservations],
    payments: room.payments,
  };
}

export const DEMO_SEED_COUNTS = {
  get expectedMinReservations() {
    return 50;
  },
};
