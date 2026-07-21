#!/usr/bin/env node
/**
 * Paystack test-mode booking QA (cashier + customer).
 *
 * Auth: https://paystack.com/docs/api/authentication/
 *   Authorization: Bearer sk_test_…
 *
 * Usage:
 *   npm run test:paystack           # auth check + unit/API flows (demo)
 *   npm run test:paystack -- --live # also hit Paystack test API with your keys
 *
 * Paystack dashboard (Test mode):
 *   Callback URL: https://www.reliefhotelsandsuites.com/payment/callback
 *   Webhook URL:  (leave empty — not implemented yet)
 *   Do not use reservation.reliefhotelsandsuites.com for guest callback
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const live = process.argv.includes("--live");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...env },
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed (${code})`));
    });
  });
}

async function authProbe() {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  const pub = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
  console.log("\n▶ Paystack authentication probe");
  console.log(`  public key: ${pub ? `${pub.slice(0, 10)}…` : "(missing)"}`);
  console.log(`  secret key: ${secret ? `${secret.slice(0, 10)}…` : "(missing)"}`);

  if (!secret.startsWith("sk_test_") || !pub.startsWith("pk_test_")) {
    console.log(
      "  ⚠ Set Test keys (pk_test_ / sk_test_) in .env.local for live Paystack QA.",
    );
    return false;
  }

  const res = await fetch("https://api.paystack.co/balance", {
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 || !res.ok || body.status === false) {
    console.error(
      `  ✗ Auth failed (${res.status}): ${body.message ?? "Unauthorized"}`,
    );
    console.error(
      "  Tip: rotate/copy fresh Test secret from Paystack → API Keys & Webhooks.",
    );
    console.error("  Leave IP whitelist empty; do not use Live keys for this QA.");
    return false;
  }
  console.log("  ✓ Authenticated (test mode) — Authorization: Bearer sk_test_… OK");
  return true;
}

async function main() {
  loadEnvLocal();

  console.log("Relief Hotels — Paystack booking test");
  console.log("Order: (1) cashier settle  (2) customer checkout");
  console.log(
    "Callback URL (dashboard): https://www.reliefhotelsandsuites.com/payment/callback",
  );

  const authOk = await authProbe();

  console.log("\n▶ Demo flows (cashier cash + customer demo verify)");
  await run(
    "npx",
    [
      "tsx",
      "--test",
      "tests/unit/paystack-auth.test.ts",
      "tests/api/paystack-booking-flows.test.ts",
    ],
    {
      DEMO_MODE: "true",
      RUN_PAYSTACK_LIVE: "",
      // Keep demo path offline from production integrations.
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      RESEND_API_KEY: "",
      PAYSTACK_SECRET_KEY: "",
      PAYSTACK_TERMINAL_ID: "",
    },
  );

  if (live) {
    if (!authOk) {
      throw new Error("Cannot run --live without working Paystack test auth");
    }
    console.log("\n▶ Live Paystack test-mode initialize");
    await run(
      "npx",
      ["tsx", "--test", "tests/api/paystack-booking-flows.test.ts"],
      { RUN_PAYSTACK_LIVE: "1", DEMO_MODE: "" },
    );
    console.log(
      "\nManual card step (customer): open authorization_url from the test log,",
    );
    console.log("  use card 4084084084084081 / any CVV / future expiry / PIN 0000 / OTP 123456");
    console.log(
      "Cashier Paystack Terminal: needs PAYSTACK_TERMINAL_ID; otherwise use Cash settle.",
    );
  } else {
    console.log("\nTip: npm run test:paystack -- --live  # real sk_test_ initialize");
  }

  console.log("\n✓ Paystack booking tests finished");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
