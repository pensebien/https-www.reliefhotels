import { loadManagedBooking } from "@/lib/booking-engine/manage-service";
import { checkinState } from "@/lib/checkin/availability";
import { getCheckinSettings } from "@/lib/checkin/settings";
import { findCheckin, saveCheckin } from "@/lib/checkin/store";
import { sniffImage } from "@/lib/image-sniff";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_BYTES = 5 * 1024 * 1024;

const fieldsSchema = z.object({
  arrivalTime: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose an arrival time"),
  nationality: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(300),
  purposeOfStay: z.enum(["leisure", "business", "conference", "other"]),
  idType: z.enum(["passport", "national_id", "drivers_licence", "voters_card"]),
  idNumber: z.string().trim().min(4).max(40),
  consent: z.literal("yes"),
});

/** Guest online check-in from the signed manage link (multipart, optional ID photo). */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid check-in form" }, { status: 400 });

  const result = await loadManagedBooking({ id: form.get("id"), t: form.get("t") });
  if (!result.ok) return result.response;
  const { members } = result.booking;
  const lead = members[0];

  const settings = await getCheckinSettings();
  const { state } = checkinState(members, settings, Boolean(await findCheckin(lead.id)));
  if (state !== "open") {
    const message =
      state === "done" ? "You've already checked in online." : "Online check-in isn't open for this booking.";
    return NextResponse.json({ error: message, state }, { status: 409 });
  }

  const parsed = fieldsSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  }

  const file = form.get("idPhoto");
  let photo: { bytes: Uint8Array; ext: string; contentType: string } | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "The ID photo is larger than 5 MB" }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind) return NextResponse.json({ error: "Upload the ID as a JPEG, PNG or WebP photo" }, { status: 400 });
    photo = { bytes, ...kind };
  } else if (settings.requireIdPhoto) {
    return NextResponse.json({ error: "Please add a photo of your ID" }, { status: 400 });
  }

  const { consent: _consent, ...details } = parsed.data;
  try {
    await saveCheckin({ reservationId: lead.id, ...details }, photo);
    return NextResponse.json({ ok: true, state: "done", instructions: settings.instructions });
  } catch (error) {
    console.error("[booking/manage/checkin]", error);
    return NextResponse.json({ error: "Check-in couldn't be saved. Please try again." }, { status: 500 });
  }
}
