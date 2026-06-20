import { z } from "zod";

export const paystackInitializeSchema = z.object({
  email: z.string().email(),
  itemType: z.literal("room").default("room"),
  itemId: z.string().min(1),
  reservationId: z.string().uuid(),
  nights: z.number().int().min(1).max(30).optional(),
  /** Demo-friendly fixed amount in NGN (overrides calculated amount) */
  demoAmountNgn: z.number().int().positive().optional(),
});

export type PaystackInitializeInput = z.infer<typeof paystackInitializeSchema>;
