#!/usr/bin/env node
/**
 * Phase A — verify Supabase env + schema before production deploy.
 * Usage: node scripts/verify-supabase.mjs
 * Loads .env.local via dotenv if present (manual export also works).
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("  Set in .env.local or Netlify env vars.");
  console.error("  See docs/supabase/schema.sql");
  process.exit(1);
}

const tables = ["reservations", "payments", "notification_log"];

console.log("▶ Supabase verify:", url);

for (const table of tables) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`✗ Table "${table}" — HTTP ${res.status}`);
    console.error(`  ${body.slice(0, 200)}`);
    console.error("  Run docs/supabase/schema.sql in Supabase SQL Editor.");
    process.exit(1);
  }

  console.log(`  ✓ ${table}`);
}

console.log("\n✓ Supabase ready for production persistence.\n");
