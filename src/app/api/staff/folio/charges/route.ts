import {
  isValidDashboardKey,
  unauthorizedDashboardResponse,
} from "@/lib/dashboard-auth";
import {
  addFolioCharge,
  FolioStoreError,
  listFolioCharges,
} from "@/lib/folio/store";
import { createFolioChargeSchema } from "@/lib/folio/schemas";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? request.headers.get("x-demo-key");

  if (!isValidDashboardKey(key)) {
    return unauthorizedDashboardResponse();
  }

  const reservationId = searchParams.get("reservationId") ?? undefined;

  try {
    const charges = await listFolioCharges(reservationId);
    return NextResponse.json({ ok: true, charges });
  } catch (error) {
    console.error("[staff/folio/charges GET]", error);
    return NextResponse.json(
      { error: "Unable to load folio charges" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? request.headers.get("x-demo-key");

  if (!isValidDashboardKey(key)) {
    return unauthorizedDashboardResponse();
  }

  try {
    const body = await request.json();
    const parsed = createFolioChargeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid charge request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const charge = await addFolioCharge(parsed.data);
    return NextResponse.json({ ok: true, charge });
  } catch (error) {
    if (error instanceof FolioStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[staff/folio/charges POST]", error);
    const message =
      error instanceof Error ? error.message : "Unable to create charge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
