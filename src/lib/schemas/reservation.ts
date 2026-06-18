import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reservationSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  stayPreference: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  itemType: z.enum(["room", "tour", "inquiry"]).default("room"),
  roomId: z.string().max(100).optional(),
  checkIn: dateSchema.optional(),
  checkOut: dateSchema.optional(),
  guests: z.number().int().min(1).max(20).default(1),
  nights: z.number().int().min(1).max(30).optional(),
});

export type ReservationInput = z.infer<typeof reservationSchema>;
