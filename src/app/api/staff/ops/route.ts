import { cancelBooking, loadOpsBoard, recordTransferReceived, retryRayza } from "@/lib/staff-ops";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

/** Online bookings with their payment and RAYZA status. */
export async function GET(request: Request) {
  const access = await requireStaffAccess(request);
  if (!access.ok) return access.response;
  try {
    return NextResponse.json({ ok: true, bookings: await loadOpsBoard() });
  } catch (error) {
    console.error("[staff/ops]", error);
    return NextResponse.json({ error: "Unable to load bookings" }, { status: 500 });
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("record_transfer"),
    reservationId: z.string().min(1).max(64),
    amountNgn: z.number().int().min(1).max(100_000_000),
  }),
  z.object({ action: z.literal("retry_rayza"), reservationId: z.string().min(1).max(64) }),
  z.object({ action: z.literal("cancel"), reservationId: z.string().min(1).max(64) }),
]);

export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const staffName = access.session?.name ?? null;
  const input = parsed.data;
  try {
    const result =
      input.action === "record_transfer"
        ? await recordTransferReceived(input.reservationId, input.amountNgn, staffName)
        : input.action === "retry_rayza"
          ? await retryRayza(input.reservationId)
          : await cancelBooking(input.reservationId, staffName);
    return result.ok
      ? NextResponse.json({ ok: true, message: result.message })
      : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) {
    console.error("[staff/ops]", input.action, error);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
