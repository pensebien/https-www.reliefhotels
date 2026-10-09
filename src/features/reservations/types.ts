export type ReservationFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  experienceInterests: string[];
  arrivalTime: string;
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
  /** RAYZA's per-room occupancy limit for this room type. */
  maxGuestsPerUnit?: number;
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
