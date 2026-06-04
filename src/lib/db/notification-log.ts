import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import type { NotificationEvent } from "@/lib/notifications";

export async function logNotificationAttempt(params: {
  event: NotificationEvent;
  referenceId: string;
  channel: string;
  success: boolean;
  provider?: string;
  errorMessage?: string;
}): Promise<void> {
  if (!isSupabaseEnabled()) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("notification_log").insert({
    event: params.event,
    reference_id: params.referenceId,
    channel: params.channel,
    success: params.success,
    provider: params.provider ?? null,
    error_message: params.errorMessage ?? null,
  });

  if (error) {
    console.error("[notification_log]", error.message);
  }
}
