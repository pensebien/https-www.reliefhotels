import type { ReservationRecord } from "@/lib/demo-store";
import { getWebhooks, sendToWebhook } from "@/lib/integrations/webhooks";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

/** Send a sample "booking.created" to one endpoint so the receiver can be checked. */
export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const { id } = ((await request.json().catch(() => null)) ?? {}) as { id?: string };
  const hook = (await getWebhooks()).find((h) => h.id === id);
  if (!hook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  const sample = {
    id: "00000000-0000-4000-8000-000000000000", firstName: "Test", lastName: "Guest", email: "test@example.com",
    itemType: "room", roomId: "executive-room", checkIn: "2026-12-18", checkOut: "2026-12-21", nights: 3, guests: 2,
    stayPreference: "test", message: "test", status: "pending", source: "live", createdAt: new Date().toISOString(),
    emailSent: false, quotedTotalNgn: 375_000, quotedDepositNgn: 75_000,
  } as ReservationRecord;
  const delivery = await sendToWebhook(hook, "booking.created", sample, { test: true });
  return NextResponse.json({
    ok: delivery.status === "sent",
    delivery: { status: delivery.status, httpStatus: delivery.httpStatus, error: delivery.error },
  });
}
