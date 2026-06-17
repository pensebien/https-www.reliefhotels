export type ReservationFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
  termsAccepted: boolean;
};

export type StayContext = {
  itemType: "room" | "tour";
  itemId: string;
  itemLabel: string;
  checkIn?: string;
  checkOut?: string;
  nights: number;
  guests: number;
  priceFrom: number;
};

export type ReservationFlowProps = {
  itemType: "room" | "tour";
  itemId: string;
  itemLabel: string;
  checkIn?: string;
  checkOut?: string;
  nights: number;
  guests: number;
  priceFrom: number;
  useDemoTestAmount?: boolean;
};

export type ReservationFlowStatus = "idle" | "loading" | "success" | "error";

export type BookQueryParams = {
  type?: "room" | "tour";
  id?: string;
  room?: string;
  tour?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  guests?: number;
};
