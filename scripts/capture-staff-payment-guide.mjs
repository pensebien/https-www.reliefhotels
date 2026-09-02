#!/usr/bin/env node
/**
 * Capture staff payment testing guide screenshots (Playwright).
 * Prerequisite: dev server at BASE_URL (default http://localhost:3002).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const OUT_DIR = path.join(root, "docs/testing/assets/staff-payment");

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3002";
const STAFF_KEY = process.env.STAFF_KEY ?? "relief-demo-2026";
const VIEWPORT = { width: 1280, height: 800 };

const keyQuery = `key=${encodeURIComponent(STAFF_KEY)}`;

/** @type {{ file: string; caption: string; status: 'ok' | 'skipped' | 'failed'; note?: string }[]} */
const report = [];

function staffPath(pathname) {
  const sep = pathname.includes("?") ? "&" : "?";
  return `${BASE_URL}${pathname}${sep}${keyQuery}`;
}

async function grace(page, ms = 2000) {
  await page.waitForTimeout(ms);
}

async function waitReady(page) {
  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
  } catch {
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
  }
  await grace(page, 2000);
}

async function isNotFound(page) {
  const title = await page.title().catch(() => "");
  if (/404|not found/i.test(title)) return true;
  const body = await page.locator("body").innerText({ timeout: 3000 }).catch(() => "");
  return /404|page could not be found|not found/i.test(body.slice(0, 500));
}

async function capture(page, file, caption, waitFn) {
  const outPath = path.join(OUT_DIR, file);
  try {
    if (waitFn) await waitFn(page);
    await page.screenshot({ path: outPath, fullPage: true });
    report.push({ file, caption, status: "ok" });
    console.log(`✓ ${file}`);
    return true;
  } catch (err) {
    const note = err instanceof Error ? err.message : String(err);
    report.push({ file, caption, status: "failed", note });
    console.error(`✗ ${file}: ${note}`);
    return false;
  }
}

async function captureOptional(page, url, file, caption, waitFn) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => null);
  if (!response || response.status() === 404) {
    report.push({ file, caption, status: "skipped", note: "404 or navigation failed" });
    console.log(`⊘ skipped ${file} (404 or failed load)`);
    return;
  }
  await waitReady(page);
  if (await isNotFound(page)) {
    report.push({ file, caption, status: "skipped", note: "404 page detected" });
    console.log(`⊘ skipped ${file} (404 page)`);
    return;
  }
  await capture(page, file, caption, waitFn);
}

function writeHtmlReport() {
  const items = report
    .map((r) => {
      const statusLabel =
        r.status === "ok" ? "" : ` <em>(${r.status}${r.note ? `: ${escapeHtml(r.note)}` : ""})</em>`;
      const img =
        r.status === "ok"
          ? `<img src="./${escapeHtml(r.file)}" alt="${escapeHtml(r.caption)}" loading="lazy" />`
          : `<p class="missing">Screenshot not captured${r.note ? `: ${escapeHtml(r.note)}` : ""}.</p>`;
      return `<section class="shot">
  <h2>${escapeHtml(r.file)}</h2>
  <p class="caption">${escapeHtml(r.caption)}${statusLabel}</p>
  ${img}
</section>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Staff payment testing guide — screenshots</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; }
    .shot { break-inside: avoid; margin-bottom: 2.5rem; page-break-inside: avoid; }
    .shot img { width: 100%; height: auto; border: 1px solid #ddd; border-radius: 6px; }
    .caption { color: #444; margin: 0.25rem 0 0.75rem; }
    .missing { color: #888; font-style: italic; }
    @media print { body { max-width: none; } .shot { page-break-after: always; } }
  </style>
</head>
<body>
  <h1>Staff payment testing guide</h1>
  <p>Base URL: ${escapeHtml(BASE_URL)} · Staff key: ${escapeHtml(STAFF_KEY)} · Generated ${new Date().toISOString()}</p>
${items}
</body>
</html>`;

  fs.writeFileSync(path.join(OUT_DIR, "index.html"), html, "utf8");
  console.log(`\nReport: ${path.join(OUT_DIR, "index.html")}`);
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // a) Cashier landing
  await page.goto(staffPath("/en/staff/cashier"), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitReady(page);
  await capture(page, "01-staff-login-cashier.png", "Staff cashier landing (settle deposit mode entry)", async (p) => {
    await p.getByText(/Settle deposit|Front desk|Cashier/i).first().waitFor({ timeout: 10_000 });
  });

  // b) Settle mode panel
  await capture(page, "02-cashier-settle-mode.png", "Cashier settle deposit UI (queue or settle panel)", async (p) => {
    const settleTab = p.getByRole("button", { name: /Settle deposit/i });
    if (await settleTab.isVisible().catch(() => false)) {
      await settleTab.click();
      await grace(p, 500);
    }
    await p
      .getByText(/Select a reservation|No pending|Settle payment|pending/i)
      .first()
      .waitFor({ timeout: 10_000 });
  });

  // c) Calendar
  await page.goto(staffPath("/en/staff/calendar"), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitReady(page);
  await capture(page, "03-staff-calendar.png", "Staff calendar", async (p) => {
    await p.getByText(/calendar|Back to staff|availability/i).first().waitFor({ timeout: 10_000 });
  });

  // d) Inbox
  await page.goto(staffPath("/en/staff"), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitReady(page);
  await capture(page, "04-staff-inbox.png", "Staff bookings inbox", async (p) => {
    await p.getByText(/Booking inbox|inbox|reservation/i).first().waitFor({ timeout: 10_000 });
  });

  // e) Accounting (optional)
  await captureOptional(
    page,
    staffPath("/en/staff/accounting"),
    "05-accounting.png",
    "Staff accounting ledger",
    async (p) => {
      await p.getByText(/accounting|ledger|reconciliation/i).first().waitFor({ timeout: 10_000 });
    },
  );

  // f) Customer rooms
  const roomsUrl = `${BASE_URL}/en/rooms?checkIn=2026-09-01&checkOut=2026-09-03&rooms=1&guests=1`;
  await page.goto(roomsUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await waitReady(page);
  await capture(page, "06-customer-rooms.png", "Guest room search (online payment path start)", async (p) => {
    await p.getByText(/room|suite|night|available/i).first().waitFor({ timeout: 20_000 });
  });

  // g) Book form (optional)
  try {
    const bookLink = page.getByRole("link", { name: /book|reserve|select/i }).first();
    let bookUrl = null;
    if (await bookLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      bookUrl = await bookLink.getAttribute("href");
    }
    if (!bookUrl) {
      bookUrl = `${BASE_URL}/en/book?type=room&id=guest-room&checkIn=2026-09-01&checkOut=2026-09-03&rooms=1&guests=1`;
    } else if (bookUrl.startsWith("/")) {
      bookUrl = `${BASE_URL}${bookUrl}`;
    }
    await page.goto(bookUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitReady(page);
    if (await isNotFound(page)) {
      report.push({
        file: "07-book-form.png",
        caption: "Guest booking / payment form",
        status: "skipped",
        note: "book page not found",
      });
      console.log("⊘ skipped 07-book-form.png");
    } else {
      await capture(page, "07-book-form.png", "Guest booking / payment form", async (p) => {
        await p.getByText(/book|guest|payment|pay|details|checkout/i).first().waitFor({ timeout: 20_000 });
      });
    }
  } catch (err) {
    const note = err instanceof Error ? err.message : String(err);
    report.push({
      file: "07-book-form.png",
      caption: "Guest booking / payment form",
      status: "skipped",
      note,
    });
    console.log(`⊘ skipped 07-book-form.png (${note})`);
  }

  // h) F&B (optional)
  await captureOptional(
    page,
    staffPath("/en/staff/fnb"),
    "08-fnb.png",
    "Staff F&B charges",
    async (p) => {
      await p.getByText(/F&B|food|charge|menu/i).first().waitFor({ timeout: 10_000 });
    },
  );

  await browser.close();
  writeHtmlReport();

  const created = report.filter((r) => r.status === "ok").map((r) => r.file);
  const failed = report.filter((r) => r.status === "failed");
  const skipped = report.filter((r) => r.status === "skipped");

  console.log("\n--- Summary ---");
  console.log("Created:", created.join(", ") || "(none)");
  if (skipped.length) console.log("Skipped:", skipped.map((s) => `${s.file} (${s.note})`).join("; "));
  if (failed.length) console.log("Failed:", failed.map((f) => `${f.file} (${f.note})`).join("; "));

  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
