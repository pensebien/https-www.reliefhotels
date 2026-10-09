import { rayzaOverview, reconcileRayza, saveRayzaRoomLinks } from "@/lib/integrations/rayza-sync";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

/** RAYZA HMS: connection, room catalogue, room links and recent sync results. */
export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  return NextResponse.json({ ok: true, ...(await rayzaOverview()) });
}

/** Save which RAYZA room type each Relief room type is. */
export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  try {
    const links = await saveRayzaRoomLinks(await request.json().catch(() => null));
    return NextResponse.json({ ok: true, links });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save" }, { status: 400 });
  }
}

const actionSchema = z.object({ action: z.literal("sync") });

/** `sync`: push/cancel everything now, retrying bookings that kept failing. */
export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  try {
    return NextResponse.json({ ok: true, summary: await reconcileRayza({ retryAll: true }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 502 });
  }
}
