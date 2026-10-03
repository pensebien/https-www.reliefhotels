import { resendDelivery } from "@/lib/integrations/webhooks";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const { id } = ((await request.json().catch(() => null)) ?? {}) as { id?: string };
  const result = id ? await resendDelivery(id) : null;
  if (!result) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
  return NextResponse.json({ ok: result.status === "sent", status: result.status, httpStatus: result.httpStatus });
}
