import { getBankTransferPublicConfig } from "@/lib/bank-transfer";
import { getServerConfig } from "@/lib/config";
import { checkStorageHealth } from "@/lib/db/health";
import { listRoomBlocks } from "@/lib/db/inventory-store";
import { getActivity } from "@/lib/demo-store";
import { getEventInquiries, getGuestFeedback } from "@/lib/inquiry-store";
import { getMoniepointPublicConfig } from "@/lib/moniepoint";
import { getPaystackTerminalPublicConfig } from "@/lib/paystack-terminal";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireStaffAccess(request);
  if (!access.ok) return access.response;

  const config = getServerConfig();

  try {
    const activity = await getActivity();
    const eventInquiries = await getEventInquiries();
    const guestFeedback = await getGuestFeedback();
    const storageHealth = await checkStorageHealth();
    const roomBlocks = await listRoomBlocks();

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
      paystackTerminal: getPaystackTerminalPublicConfig(),
      bankTransfer: getBankTransferPublicConfig(),
      ...activity,
      eventInquiries,
      guestFeedback,
      roomBlocks,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard data";
    console.error("[demo/activity]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
