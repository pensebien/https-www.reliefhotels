import { buildRateCalendar, MAX_CALENDAR_DAYS, saveRateCalendarEdit } from "@/lib/booking-engine/rate-calendar";
import { RateConfigValidationError } from "@/lib/booking-engine/rate-config";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Price, rooms left and rules per room type and day. */
export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const from = ymd.safeParse(url.searchParams.get("from"));
  const days = Number(url.searchParams.get("days") ?? 14);
  if (!from.success || !Number.isInteger(days) || days < 1 || days > MAX_CALENDAR_DAYS) {
    return NextResponse.json({ error: `Give from=YYYY-MM-DD and days=1–${MAX_CALENDAR_DAYS}` }, { status: 400 });
  }
  // Signed-in staff: only managers edit. Dashboard-key mode: the page follows the role picker.
  const canEdit = access.session ? access.session.role === "manager" : null;
  return NextResponse.json({ ok: true, canEdit, ...(await buildRateCalendar(from.data, days)) });
}

const editSchema = z
  .object({
    roomId: z.string().min(1).max(100),
    from: ymd,
    to: ymd,
    nightlyNgn: z.number().int().min(1).max(100_000_000).optional(),
    closed: z.boolean().optional(),
  })
  .refine((e) => e.to > e.from, { message: "End must be after start" })
  .refine((e) => e.nightlyNgn !== undefined || e.closed !== undefined, { message: "Give a price or open/close" });

/** Set a price and/or stop sale for nights [from, to). Managers only. */
export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }
  try {
    await saveRateCalendarEdit(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RateConfigValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
