import { getRateConfig } from "@/lib/booking-engine/rate-config";
import { NextResponse } from "next/server";

/** Public: which tracking IDs the consent banner may load (none → no banner). */
export async function GET() {
  const { gaMeasurementId, metaPixelId } = (await getRateConfig()).engine.analytics ?? {};
  return NextResponse.json(
    { gaMeasurementId: gaMeasurementId ?? null, metaPixelId: metaPixelId ?? null },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
