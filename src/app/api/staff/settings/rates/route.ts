import {
  getRateConfig,
  RateConfigValidationError,
  saveRateConfig,
} from "@/lib/booking-engine/rate-config";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;

  try {
    return NextResponse.json({ ok: true, config: await getRateConfig() });
  } catch (error) {
    console.error("[staff/settings/rates GET]", error);
    return NextResponse.json({ error: "Unable to load rates" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;

  try {
    const config = await saveRateConfig(await request.json());
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    if (error instanceof RateConfigValidationError) {
      return NextResponse.json(
        { error: "Invalid rate settings", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("[staff/settings/rates PUT]", error);
    return NextResponse.json({ error: "Unable to save rates" }, { status: 500 });
  }
}
