import { NextResponse } from "next/server";

/** Public: which tracking IDs the consent banner may load (none → no banner). */
export async function GET() {
  return NextResponse.json(
    {
      gaMeasurementId: process.env.GA_MEASUREMENT_ID?.trim() || null,
      metaPixelId: process.env.META_PIXEL_ID?.trim() || null,
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
