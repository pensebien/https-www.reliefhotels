import {
  getRayzaRoomLinks,
  importRayzaRoomNumbers,
  rayzaOverview,
  reconcileRayza,
  saveRayzaRoomLinks,
} from "@/lib/integrations/rayza-sync";
import { RoomSetupValidationError } from "@/lib/room-setup";
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

const actionSchema = z.union([
  z.object({ action: z.literal("import"), roomIds: z.array(z.string().max(100)).min(1).max(20) }),
  z.object({ action: z.literal("sync") }),
]);

/** `import`: copy RAYZA's room numbers into room setup. `sync`: push/cancel everything now. */
export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  try {
    if (parsed.data.action === "sync") {
      return NextResponse.json({ ok: true, summary: await reconcileRayza({ retryAll: true }) });
    }
    const links = await getRayzaRoomLinks();
    const unlinked = parsed.data.roomIds.filter((id) => !links[id]);
    if (unlinked.length) {
      return NextResponse.json({ error: "Link and save these room types first" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...(await importRayzaRoomNumbers(parsed.data.roomIds)) });
  } catch (error) {
    const message =
      error instanceof RoomSetupValidationError ? error.issues.join("; ") : error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: error instanceof RoomSetupValidationError ? 400 : 502 });
  }
}
