import { recentMessages } from "@/lib/guest-messages/log";
import { PLACEHOLDERS } from "@/lib/guest-messages/render";
import {
  getGuestMessages,
  GuestMessagesValidationError,
  saveGuestMessages,
} from "@/lib/guest-messages/settings";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const [settings, log] = await Promise.all([getGuestMessages(), recentMessages(50)]);
  return NextResponse.json({
    ok: true,
    settings,
    log,
    placeholders: PLACEHOLDERS,
    scheduled: Boolean(process.env.CRON_SECRET?.trim()),
  });
}

export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  try {
    const settings = await saveGuestMessages(await request.json());
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof GuestMessagesValidationError) {
      return NextResponse.json({ error: "Invalid message templates", issues: error.issues }, { status: 400 });
    }
    console.error("[staff/settings/messages PUT]", error);
    return NextResponse.json({ error: "Unable to save message templates" }, { status: 500 });
  }
}
