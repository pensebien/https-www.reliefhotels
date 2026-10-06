import { z } from "zod";

export const staffReservationPatchSchema = z
  .object({
    status: z.enum(["confirmed", "cancelled", "checked_out"]).optional(),
    staffNotes: z.string().max(2000).optional(),
    /** Replaces the booking's tags; trimmed, de-duplicated, empty ones dropped. */
    tags: z
      .array(z.string().trim().max(30))
      .max(10)
      .transform((tags) => [...new Set(tags.filter(Boolean))])
      .optional(),
  })
  .refine((data) => data.status !== undefined || data.staffNotes !== undefined || data.tags !== undefined, {
    message: "Provide status, staffNotes and/or tags",
  });

export type StaffReservationPatch = z.infer<typeof staffReservationPatchSchema>;
