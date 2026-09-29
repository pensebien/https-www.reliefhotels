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
};

/** Bookable extra as shown to the guest (from RateConfig, server-filtered by room). */
export type BookableExtra = {
  id: string;
  label: string;
  priceNgn: number;
  pricing: "per_stay" | "per_night" | "per_guest_night";
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
