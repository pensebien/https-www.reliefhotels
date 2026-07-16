import { FOLIO_CHARGE_STATUSES } from "@/lib/folio/types";
import { z } from "zod";

export const folioChargeStatusSchema = z.enum(
  FOLIO_CHARGE_STATUSES as [string, ...string[]],
);

export const createFolioChargeSchema = z.object({
  reservationId: z.string().min(1),
  sku: z.string().min(1),
  qty: z.number().int().positive().max(50).default(1),
});

/** Staff can only move a charge into these states via PATCH — "open" is create-time only. */
export const patchFolioChargeSchema = z.object({
  status: z.enum(["posted", "paid", "void"]),
});

export type CreateFolioChargeInput = z.infer<typeof createFolioChargeSchema>;
export type PatchFolioChargeInput = z.infer<typeof patchFolioChargeSchema>;
