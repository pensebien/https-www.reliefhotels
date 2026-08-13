import { getTaxSettings, updateTaxSettings } from "@/lib/tax-settings";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchTaxSettingsSchema = z
  .object({
    vatPercentage: z.number().min(0).max(100).optional(),
    collectionMode: z.enum(["absorbed", "pass_through"]).optional(),
  })
  .refine(
    (data) => data.vatPercentage !== undefined || data.collectionMode !== undefined,
    { message: "Provide vatPercentage and/or collectionMode" },
  );

export async function GET(request: Request) {
  // Any staff role needs to read this to render a guest bill correctly.
  const access = await requireStaffAccess(request);
  if (!access.ok) return access.response;

  try {
    const settings = await getTaxSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("[staff/settings/tax GET]", error);
    return NextResponse.json(
      { error: "Unable to load tax settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const access = await requireStaffAccess(request, ["manager", "restaurant_owner"]);
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const parsed = patchTaxSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid tax settings", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const settings = await updateTaxSettings(parsed.data);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("[staff/settings/tax PATCH]", error);
    const message =
      error instanceof Error ? error.message : "Unable to update tax settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
