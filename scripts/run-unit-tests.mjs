#!/usr/bin/env node
/**
 * Unit + API tests with a deterministic demo env (no Supabase / Paystack / Resend).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

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
    },
  },
);

child.on("close", (code) => process.exit(code ?? 1));
