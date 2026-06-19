/**
 * Insert demo reservations + payments into Supabase (source = demo).
 *
 * Usage:
 *   npm run seed:supabase:demo
 *   npm run seed:supabase:demo -- --fresh
 *
 * Cleanup: npm run clean:supabase:demo
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDemoSeeds } from "../src/content/demo-seed-generator";
import type { PaymentRecord, ReservationRecord } from "../src/lib/demo-store";
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
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const fresh = process.argv.includes("--fresh");

function jwtRole(key: string): string | null {
  try {
    const part = key.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as {
      role?: string;
    };
    return json.role ?? null;
  } catch {
    return null;
  }
}

function reservationRow(r: ReservationRecord) {
  return {
    id: r.id,
    first_name: r.firstName,
    last_name: r.lastName,
    email: r.email,
    phone: r.phone ?? null,
    check_in: r.checkIn ?? null,
    check_out: r.checkOut ?? null,
    room_id: r.roomId ?? null,
    guests: r.guests,
    nights: r.nights ?? null,
    item_type: r.itemType,
    payment_reference: r.paymentReference ?? null,
    stay_preference: r.stayPreference,
    message: r.message,
    status: r.status,
    source: "demo" as const,
    email_sent: r.emailSent,
    created_at: r.createdAt,
  };
}

function paymentRow(p: PaymentRecord) {
  return {
    id: p.id,
    reference: p.reference,
    reservation_id: p.reservationId ?? null,
    email: p.email,
    amount_kobo: p.amountKobo,
    currency: p.currency,
    status: p.status,
    item_type: p.itemType,
    item_id: p.itemId,
    item_label: p.itemLabel,
    source: "demo" as const,
    created_at: p.createdAt,
  };
}

async function main() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const role = serviceKey ? jwtRole(serviceKey) : null;
  if (role && role !== "service_role") {
    console.error(`✗ SUPABASE_SERVICE_ROLE_KEY has role "${role}", expected "service_role".`);
    console.error("  Use the service_role secret from Supabase → Settings → API (not anon/publishable).");
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const { reservations, payments } = generateDemoSeeds();

  console.log("▶ Supabase demo seed");
  console.log(`  ${reservations.length} reservations, ${payments.length} payments`);
  console.log(`  target: ${process.env.SUPABASE_URL}`);

  if (fresh) {
    console.log("\n▶ Removing existing demo rows (--fresh)…");
    const { error: payDel } = await supabase
      .from("payments")
      .delete()
      .eq("source", "demo");
    if (payDel) throw new Error(payDel.message);

    const { error: resDel } = await supabase
      .from("reservations")
      .delete()
      .eq("source", "demo");
    if (resDel) throw new Error(resDel.message);
    console.log("  ✓ cleared demo source rows");
  }

  console.log("\n▶ Upserting reservations…");
  const resRows = reservations.map(reservationRow);
  const batchSize = 25;
  for (let i = 0; i < resRows.length; i += batchSize) {
    const batch = resRows.slice(i, i + batchSize);
    const { error } = await supabase.from("reservations").upsert(batch, {
      onConflict: "id",
    });
    if (error) throw new Error(`reservations: ${error.message}`);
    process.stdout.write(`  ✓ reservations ${Math.min(i + batchSize, resRows.length)}/${resRows.length}\n`);
  }

  console.log("▶ Upserting payments…");
  const payRows = payments.map(paymentRow);
  for (let i = 0; i < payRows.length; i += batchSize) {
    const batch = payRows.slice(i, i + batchSize);
    const { error } = await supabase.from("payments").upsert(batch, {
      onConflict: "reference",
    });
    if (error) throw new Error(`payments: ${error.message}`);
    process.stdout.write(`  ✓ payments ${Math.min(i + batchSize, payRows.length)}/${payRows.length}\n`);
  }

  console.log("\n✓ Demo data written to Supabase (source = demo).");
  console.log("  Clean up later: npm run clean:supabase:demo\n");
}

main().catch((err) => {
  console.error("✗ Seed failed:", err instanceof Error ? err.message : err);
  console.error("\n  Tip: use the service_role key (not anon/publishable) in SUPABASE_SERVICE_ROLE_KEY.");
  console.error("  If the key is correct, run docs/supabase/migration-003-service-role-policies.sql in SQL Editor.");
  console.error("  See docs/supabase/seed-demo.md\n");
  process.exit(1);
});
