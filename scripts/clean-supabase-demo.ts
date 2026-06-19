/**
 * Remove demo-seeded rows from Supabase (source = demo).
 * Usage: npm run clean:supabase:demo
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSupabaseAdmin } from "../src/lib/db/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq);
    const v = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

async function main() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("▶ Clean Supabase demo data:", process.env.SUPABASE_URL);

  const { count: payCount } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("source", "demo");

  const { count: resCount } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("source", "demo");

  console.log(`  found ${resCount ?? 0} demo reservations, ${payCount ?? 0} demo payments`);

  const { error: payErr } = await supabase
    .from("payments")
    .delete()
    .eq("source", "demo");
  if (payErr) throw new Error(payErr.message);

  const { error: resErr } = await supabase
    .from("reservations")
    .delete()
    .eq("source", "demo");
  if (resErr) throw new Error(resErr.message);

  console.log("\n✓ Removed demo rows (source = demo).\n");
}

main().catch((err) => {
  console.error("✗ Clean failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
