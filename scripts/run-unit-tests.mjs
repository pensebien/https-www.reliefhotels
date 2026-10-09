#!/usr/bin/env node
/**
 * Unit + API tests with a deterministic demo env (no Supabase / Paystack / Resend).
 */
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// Each run gets a fresh copy of the tracked seed data, so tests never touch
// (or pile bookings up in) your local data/ folder, and runs don't collide.
const dataDir = mkdtempSync(path.join(os.tmpdir(), "relief-tests-"));
cpSync(path.join(root, "data"), dataDir, {
  recursive: true,
  filter: (src) => !/demo-store|inquiries|folio-charges|staff-accounts|invoices|guest-message-log|rate-config|settings/.test(path.basename(src)),
});

const child = spawn(
  "npx",
  [
    "tsx",
    "--test",
    "--test-concurrency=1",
    "tests/unit/*.test.ts",
    "tests/api/*.test.ts",
  ],
  {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      RELIEF_DATA_DIR: dataDir,
      DEMO_MODE: "true",
      NOTIFY_CHANNEL: "console",
      NEXT_PUBLIC_APP_URL: "http://localhost:3002",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      PAYSTACK_SECRET_KEY: "",
      PAYSTACK_PUBLIC_KEY: "",
      NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: "",
      PAYSTACK_TERMINAL_ID: "",
      RESEND_API_KEY: "",
      MONIEPOINT_CLIENT_ID: "",
      MONIEPOINT_CLIENT_SECRET: "",
      MONIEPOINT_TERMINAL_SERIAL: "",
      // Tests that need RAYZA turn it on against a fake; never the real relay.
      RAYZA_CONNECT_ENABLED: "",
      // Many requests come from one address in tests; tests/api/hardening turns limits back on.
      RATE_LIMIT_DISABLED: "true",
      RAYZA_API_KEY: "",
    },
  },
);

child.on("close", (code) => {
  rmSync(dataDir, { recursive: true, force: true });
  process.exit(code ?? 1);
});
