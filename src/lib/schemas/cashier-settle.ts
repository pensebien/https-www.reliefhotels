import { CASHIER_PAYMENT_METHODS } from "@/lib/cashier/types";
import { z } from "zod";

export const cashierPaymentMethodSchema = z.enum(CASHIER_PAYMENT_METHODS);

export const cashierSettleSchema = z.object({
  reservationId: z.string().uuid(),
  amountNgn: z.number().int().positive(),
  paymentMethod: cashierPaymentMethodSchema,
  clientMutationId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

export type CashierSettleInput = z.infer<typeof cashierSettleSchema>;
