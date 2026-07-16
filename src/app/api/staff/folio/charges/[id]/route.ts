import {
  isValidDashboardKey,
  unauthorizedDashboardResponse,
} from "@/lib/dashboard-auth";
import { FolioStoreError, updateFolioChargeStatus } from "@/lib/folio/store";
import { patchFolioChargeSchema } from "@/lib/folio/schemas";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? request.headers.get("x-demo-key");

  if (!isValidDashboardKey(key)) {
    return unauthorizedDashboardResponse();
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = patchFolioChargeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid status update", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const charge = await updateFolioChargeStatus(id, parsed.data.status);
    return NextResponse.json({ ok: true, charge });
  } catch (error) {
    if (error instanceof FolioStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[staff/folio/charges/[id] PATCH]", error);
    const message =
      error instanceof Error ? error.message : "Unable to update charge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
