#!/usr/bin/env node
/**
 * Run human-like automated prototype sessions (Playwright).
 *
 * Usage:
 *   npm run test:prototype              # build + start test server on :3012
 *   npm run test:prototype -- --headed  # watch the browser
 *   SKIP_WEB_SERVER=1 npm run test:prototype   # server on BASE_URL with DEMO_MODE=true
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sessionsDir = path.join(root, "test-results", "prototype-sessions");

const extraArgs = process.argv.slice(2);
const skipServer = Boolean(process.env.SKIP_WEB_SERVER);
const testPort = process.env.PLAYWRIGHT_PORT ?? "3012";
const baseUrl = process.env.BASE_URL ?? `http://localhost:${testPort}`;

const testEnv = {
  ...process.env,
  BASE_URL: baseUrl,
  DEMO_MODE: "true",
  NOTIFY_CHANNEL: "console",
  NEXT_PUBLIC_APP_URL: baseUrl,
  PAYSTACK_SECRET_KEY: "",
  PAYSTACK_PUBLIC_KEY: "",
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: "",
  RESEND_API_KEY: "",
};

function run(command, args, label) {
  return new Promise((resolve, reject) => {
    if (label) console.log(`\n▶ ${label}`);
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: testEnv,
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label ?? command} failed (exit ${code})`));
    });
  });
}

function startProductionServer() {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ Starting test server at ${baseUrl}`);
    const child = spawn("npx", ["next", "start", "-p", testPort], {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: testEnv,
    });

    const deadline = Date.now() + 60_000;
    const poll = async () => {
      try {
        const res = await fetch(`${baseUrl}/en`);
        if (res.ok) {
          resolve(child);
          return;
        }
      } catch {
        /* not ready */
      }
      if (Date.now() > deadline) {
        child.kill();
        reject(new Error("Test server did not become ready in 60s"));
        return;
      }
      setTimeout(poll, 500);
    };

    child.on("error", reject);
    void poll();
  });
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log(" Relief Hotels — Automated prototype sessions");
  console.log(" (human-like Playwright personas)");
  console.log("═══════════════════════════════════════════");
  console.log(` Base URL: ${baseUrl}\n`);

  fs.rmSync(sessionsDir, { recursive: true, force: true });
  fs.mkdirSync(sessionsDir, { recursive: true });

  let serverProcess = null;

  try {
    if (!skipServer) {
      await run("npm", ["run", "build"], "Production build (demo test server)");
      serverProcess = await startProductionServer();
    }

    const playwrightArgs = [
      "playwright",
      "test",
      "tests/e2e/prototype-session.spec.ts",
      ...extraArgs,
    ];

    await run("npx", playwrightArgs, "Playwright prototype sessions");
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
    if (
      fs.existsSync(sessionsDir) &&
      fs.readdirSync(sessionsDir).some((f) => f.endsWith(".json"))
    ) {
      try {
        await run("node", ["scripts/aggregate-prototype-scorecard.mjs"], "Aggregate scorecard");
      } catch {
        /* no sessions */
      }
    }
  }

  const summaryPath = path.join(sessionsDir, "summary.json");
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    console.log("═══════════════════════════════════════════");
    console.log(" ✓ Prototype automation complete");
    console.log(`   Avg usability: ${summary.avgUsability}/5`);
    console.log(`   Recommendation: ${summary.recommendation}`);
    console.log(
      "   Report: project-context/01-prototyping/validation-reports/automated-prototype-report.md",
    );
    console.log("   Next: run 1–2 human sessions for premium/trust perception");
    console.log("═══════════════════════════════════════════\n");
  }

  const sessions = fs
    .readdirSync(sessionsDir)
    .filter((f) => f.startsWith("P-A") && f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(sessionsDir, f), "utf8")));

  if (sessions.some((s) => s.tasksPassed < 5)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`\n✗ Prototype automation failed: ${error.message}\n`);
  process.exit(1);
});
