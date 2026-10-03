import type { ReservationRecord } from "@/lib/demo-store";
import { deliver } from "@/lib/guest-messages/run";
import { messageTemplateSchema } from "@/lib/guest-messages/settings";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  template: messageTemplateSchema,
  /** Staff address or phone to receive the test. */
  to: z.string().trim().min(5).max(120),
});

/** Send one template, filled with a sample booking, to a staff email or phone. */
export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Give a valid template and where to send the test" }, { status: 400 });
  }
  const { template, to } = parsed.data;
  if (template.channel === "email" && !z.string().email().safeParse(to).success) {
    return NextResponse.json({ error: "Enter an email address for an email test" }, { status: 400 });
  }

  const sample: ReservationRecord = {
    id: "00000000-0000-4000-8000-000000000000",
    firstName: "Ada",
    lastName: "Okafor",
    email: to,
    phone: to,
    itemType: "room",
    roomId: "executive-room",
    checkIn: "2026-12-18",
    checkOut: "2026-12-21",
    nights: 3,
    guests: 2,
    stayPreference: "sample",
    message: "sample",
    status: "confirmed",
    source: "live",
    createdAt: new Date().toISOString(),
    emailSent: false,
    assignedUnits: ["executive-room-1"],
  };
  const status = await deliver(template, sample);
  return NextResponse.json({ ok: status === "sent", status });
}
