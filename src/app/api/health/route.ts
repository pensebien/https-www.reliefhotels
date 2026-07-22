import { getServerConfig } from "@/lib/config";
import { checkStorageHealth } from "@/lib/db/health";
import { NextResponse } from "next/server";

/** Public health + storage readiness (no secrets). */
export async function GET() {
  const config = getServerConfig();
  const storage = await checkStorageHealth();

  const productionReady =
    storage.mode === "supabase" && storage.connected === true;

  return NextResponse.json({
    ok: true,
    appUrl: config.appUrl,
    storage,
    productionReady,
    demoMode: config.demoMode,
    paystackConfigured: config.paystack.configured,
    paystackMode: config.paystack.mode,
    emailConfigured: config.email.configured,
  });
}
