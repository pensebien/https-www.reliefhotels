import { z } from "zod";
import { parseYmd } from "@/lib/reservation-dates";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reservationSchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().trim().min(7).max(30),
    stayPreference: z.string().min(1).max(200),
    message: z.string().min(1).max(5000),
    itemType: z.enum(["room", "tour", "inquiry"]).default("room"),
    roomId: z.string().max(100).optional(),
    checkIn: dateSchema.optional(),
    checkOut: dateSchema.optional(),
    guests: z.number().int().min(1).max(20).default(1),
    nights: z.number().int().min(1).max(30).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.itemType !== "room") return;

    if (!data.checkIn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Check-in date is required for room reservations",
        path: ["checkIn"],
      });
    }
    if (!data.checkOut) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Check-out date is required for room reservations",
        path: ["checkOut"],
      });
    }
    if (!data.nights) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nights is required for room reservations",
        path: ["nights"],
      });
    }

    if (data.checkIn && data.checkOut) {
      try {
        if (parseYmd(data.checkOut) <= parseYmd(data.checkIn)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Check-out must be after check-in",
            path: ["checkOut"],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid stay dates",
          path: ["checkOut"],
        });
      }
    }
  });

export type ReservationInput = z.infer<typeof reservationSchema>;
