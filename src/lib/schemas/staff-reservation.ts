import { FRONT_DESK_PAYMENT_METHODS } from "@/lib/payment-methods";
import { parseYmd } from "@/lib/reservation-dates";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const staffPaymentOptionSchema = z.enum([
  "none",
  ...FRONT_DESK_PAYMENT_METHODS,
]);

export const staffReservationSchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(7).max(30).optional(),
    roomId: z.string().min(1).max(100),
    checkIn: dateSchema,
    checkOut: dateSchema,
    guests: z.number().int().min(1).max(20).default(1),
    message: z.string().max(5000).optional(),
    status: z.enum(["pending", "confirmed"]).default("pending"),
    /** @deprecated use paymentMethod */
    depositReceived: z.boolean().optional(),
    paymentMethod: staffPaymentOptionSchema.default("none"),
    transferReference: z.string().max(100).optional(),
    depositAmountNgn: z.number().int().positive().optional(),
  })
  .transform((data) => {
    const paymentMethod =
      data.paymentMethod === "none" && data.depositReceived
        ? ("cash" as const)
        : data.paymentMethod;
    return { ...data, paymentMethod };
  })
  .superRefine((data, ctx) => {
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

    if (data.paymentMethod !== "none" && data.status === "pending") {
      if (
        data.paymentMethod !== "moniepoint_terminal" &&
        data.paymentMethod !== "moniepoint_transfer" &&
        data.paymentMethod !== "paystack_terminal"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mark reservation as confirmed when deposit is received",
          path: ["status"],
        });
      }
    }
  });

export type StaffReservationInput = z.infer<typeof staffReservationSchema>;
