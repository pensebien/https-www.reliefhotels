import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { getStorageMode } from "@/lib/demo-store";

export type StorageHealth = {
  mode: "supabase" | "file";
  supabaseConfigured: boolean;
  connected: boolean | null;
  message: string;
};

/** Verify Supabase is reachable and core tables exist. */
export async function checkStorageHealth(): Promise<StorageHealth> {
  const mode = getStorageMode();
  const supabaseConfigured = isSupabaseEnabled();

  if (mode === "file") {
    return {
      mode,
      supabaseConfigured,
      connected: null,
      message:
        "Using local file store — bookings will not persist on serverless hosts. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      mode,
      supabaseConfigured: false,
      connected: false,
      message: "Supabase env vars missing or invalid.",
    };
  }

  try {
    const { error } = await supabase.from("reservations").select("id").limit(1);
    if (error) {
      return {
        mode,
        supabaseConfigured: true,
        connected: false,
        message: error.message,
      };
    }

    return {
      mode,
      supabaseConfigured: true,
      connected: true,
      message: "Supabase connected — reservations persist across deploys.",
    };
  } catch (error) {
    return {
      mode,
      supabaseConfigured: true,
      connected: false,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
