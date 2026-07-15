import { z } from "zod";

export const staffReservationPatchSchema = z
  .object({
    status: z.enum(["confirmed", "cancelled"]).optional(),
    staffNotes: z.string().max(2000).optional(),
  })
  .refine((data) => data.status !== undefined || data.staffNotes !== undefined, {
    message: "Provide status and/or staffNotes",
  });

export type StaffReservationPatch = z.infer<typeof staffReservationPatchSchema>;
