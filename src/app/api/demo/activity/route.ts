import { getServerConfig } from "@/lib/config";
import { checkStorageHealth } from "@/lib/db/health";
import { getActivity } from "@/lib/demo-store";
import { getEventInquiries, getGuestFeedback } from "@/lib/inquiry-store";
import { getMoniepointPublicConfig } from "@/lib/moniepoint";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const config = getServerConfig();

  if (key !== config.demoDashboardKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activity = await getActivity();
    const eventInquiries = await getEventInquiries();
    const guestFeedback = await getGuestFeedback();
    const storageHealth = await checkStorageHealth();

    return NextResponse.json({
      ok: true,
      config: {
        demoMode: config.demoMode,
        paystackConfigured: config.paystack.configured,
        emailConfigured: config.email.configured,
        appUrl: config.appUrl,
        storageMode: config.storage.mode,
        supabaseConfigured: config.storage.supabaseConfigured,
        storageHealth,
        notifyChannel: config.notifications.channel,
      },
      moniepoint: getMoniepointPublicConfig(),
      ...activity,
      eventInquiries,
      guestFeedback,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard data";
    console.error("[demo/activity]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
