export type ReservationFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  experienceInterests: string[];
  termsAccepted: boolean;
};

export type StayContext = {
  itemType: "room";
  itemId: string;
  itemLabel: string;
  checkIn?: string;
  checkOut?: string;
  nights: number;
  guests: number;
  rooms: number;
  priceFrom: number;
  couponCode?: string;
  extraIds: string[];
  /** Extra room-type lines of a group booking. */
  additionalStays: { roomId: string; rooms: number }[];
  ratePlanId?: string;
};

/** Bookable extra as shown to the guest (from RateConfig, server-filtered by room). */
export type BookableExtra = {
  id: string;
  label: string;
  priceNgn: number;
  pricing: "per_stay" | "per_night" | "per_guest_night" | "per_room" | "per_room_night";
  /** Always part of the booking; shown ticked and locked. */
  included?: boolean;
};

/** Another room type the guest can add to the same stay (group booking). */
export type AddableRoom = {
  id: string;
  label: string;
  priceFrom: number;
  availableUnits: number;
  maxGuestsPerUnit: number;
};

/** Alternative rate offered at checkout (from RateConfig.ratePlans). */
export type BookableRatePlan = {
  id: string;
  label: string;
  description: string;
  adjustPct: number;
  refundable: boolean;
};

export type ReservationFlowProps = {
  itemId: string;
  itemLabel: string;
  checkIn?: string;
  checkOut?: string;
  nights: number;
  guests: number;
  priceFrom: number;
  rooms?: number;
  maxGuestsPerUnit?: number;
  extras?: BookableExtra[];
  /** Other room types free for these dates, for "Add another room type". */
  addableRooms?: AddableRoom[];
  ratePlans?: BookableRatePlan[];
  useDemoTestAmount?: boolean;
};

export type ReservationFlowStatus = "idle" | "loading" | "success" | "error";

export type BookQueryParams = {
  id?: string;
  room?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  guests?: number;
};
