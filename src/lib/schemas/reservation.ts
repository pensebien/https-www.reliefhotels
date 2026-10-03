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
    nights: z.number().int().min(1).max(365).optional(),
    /** Rooms of this type (booking engine); server re-quotes and re-checks availability. */
    rooms: z.number().int().min(1).max(4).optional(),
    couponCode: z.string().trim().max(40).optional(),
    /** Rate plan the guest chose (e.g. non-refundable); omit for the standard rate. */
    ratePlanId: z.string().max(60).optional(),
    /** Expected arrival time "HH:MM" (booking engine arrival-time question). */
    customFields: z.record(z.string().max(40), z.union([z.string().max(500), z.boolean()])).optional(),
    arrivalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    extraIds: z.array(z.string().max(60)).max(20).optional(),
    /**
     * Group booking: several room types on the same dates. When present the
     * first line is the lead (roomId must match it) and `guests` is the total.
     */
    stays: z
      .array(z.object({ roomId: z.string().min(1).max(100), rooms: z.number().int().min(1).max(4) }))
      .min(1)
      .max(4)
      .optional(),
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
