#!/usr/bin/env node
/**
 * Relief Hotels — automated reservation QA runner
 * Usage:
 *   npm run test:qa              # unit + API tests + build
 *   npm run test:qa:live         # above + HTTP smoke (server must be running)
 *   BASE_URL=https://... npm run test:qa:live
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const live = process.argv.includes("--live");
const baseUrl = process.env.BASE_URL ?? "http://localhost:3002";

function run(command, args, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${label}`);
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        DEMO_MODE: "true",
        NOTIFY_CHANNEL: "console",
        NEXT_PUBLIC_APP_URL: baseUrl,
      },
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed (exit ${code})`));
    });
  });
}

async function httpSmoke() {
  console.log(`\n▶ HTTP smoke tests (${baseUrl})`);
  const paths = ["/en", "/en/rooms", "/en/book?type=room&id=signature-suite"];
  for (const p of paths) {
    const url = `${baseUrl.replace(/\/$/, "")}${p}`;
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    console.log(`  ✓ ${p} → ${res.status}`);
  }

  const availabilityUrl = new URL("/api/rooms/availability", baseUrl);
  availabilityUrl.searchParams.set("checkIn", "2026-08-01");
  availabilityUrl.searchParams.set("checkOut", "2026-08-03");
  availabilityUrl.searchParams.set("rooms", "1");
  availabilityUrl.searchParams.set("guests", "2");
  const availRes = await fetch(availabilityUrl);
  const availData = await availRes.json();
  if (!availRes.ok || !availData.ok) {
    throw new Error(`Availability API failed: ${availRes.status}`);
  }
  console.log(`  ✓ GET /api/rooms/availability → ${availRes.status}`);
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log(" Relief Hotels — Reservation QA (automated)");
  console.log("═══════════════════════════════════════════");

  await run("npm", ["run", "build"], "Production build");

  const testFiles = [
    "tests/unit/booking-deposit.test.ts",
    "tests/unit/reservation-schema.test.ts",
    "tests/unit/notification-policy.test.ts",
    "tests/api/reservation-flow.test.ts",
    "tests/api/inquiry-no-notify.test.ts",
    "tests/api/health.test.ts",
  ].filter((f) => existsSync(path.join(root, f)));

  await run(
    "npx",
    ["tsx", "--test", ...testFiles],
    "Unit + API integration tests",
  );

  if (live) {
    try {
      await httpSmoke();
    } catch (error) {
      console.error(
        "\n⚠ HTTP smoke failed. Start the server first:\n  npm run dev\n  BASE_URL=http://localhost:3002 npm run test:qa:live\n",
      );
      throw error;
    }
  }

  console.log("\n═══════════════════════════════════════════");
  console.log(" ✓ Automated QA passed");
  if (!live) {
    console.log("   Run live smoke: npm run test:qa:live");
  }
  console.log("   Manual checklist: docs/testing/reservation-qa-checklist.md");
  console.log("═══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error(`\n✗ QA failed: ${error.message}\n`);
  process.exit(1);
});
