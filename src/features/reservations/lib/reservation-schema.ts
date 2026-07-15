import { z } from "zod";

export const reservationFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .min(7, "Phone number is required")
    .max(30, "Phone number is too long"),
  message: z.string().max(2000).default(""),
  experienceInterests: z.array(z.string()).default([]),
  termsAccepted: z
    .boolean()
    .refine((val) => val === true, { message: "You must accept the terms" }),
});

export type ReservationFormValues = z.infer<typeof reservationFormSchema>;
