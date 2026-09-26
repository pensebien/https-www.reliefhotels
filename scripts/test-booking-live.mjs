#!/usr/bin/env node
/**
 * Automated end-to-end test booking: guest books a room through the public
 * /book UI, pays the deposit on Paystack's hosted checkout with a TEST card,
 * and lands on /payment/callback.
 *
 * Only run against an environment whose /api/health reports
 * paystackMode "test" — the script refuses otherwise so it can never charge
 * a real card.
 *
 * Usage:
 *   node scripts/test-booking-live.mjs --email you@gmail.com
 *   BASE_URL=http://localhost:3002 node scripts/test-booking-live.mjs --email you@gmail.com
 *   ... --headed        # watch the browser
 *   ... --manual-pay    # you tick Paystack's Cloudflare human check; the script pays
 *   ... --room guest-room --nights 1
 *
 * Screenshots for every step land in test-results/booking-live/<timestamp>/.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const BASE_URL = (process.env.BASE_URL ?? "https://www.reliefhotelsandsuites.com").replace(/\/+$/, "");
const EMAIL = arg("email", process.env.TEST_BOOKING_EMAIL);
const ROOM_ID = arg("room", "guest-room");
const NIGHTS = Number(arg("nights", "1"));
// Paystack checkout sits behind a Cloudflare human check that blocks
// automation — --manual-pay opens a visible browser and waits for a person
// to finish the payment step.
const MANUAL_PAY = process.argv.includes("--manual-pay");
const HEADED = MANUAL_PAY || process.argv.includes("--headed");

// Paystack test card: https://paystack.com/docs/payments/test-payments/
const CARD = { number: "4084084084084081", expiry: "12/30", cvv: "408", pin: "0000", otp: "123456" };

if (!EMAIL) {
  console.error("Missing --email (or TEST_BOOKING_EMAIL)");
  process.exit(1);
}

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const runDir = path.join(repoRoot, "test-results", "booking-live", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(runDir, { recursive: true });
let shot = 0;

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

async function snap(page, label) {
  const file = path.join(runDir, `${String(++shot).padStart(2, "0")}-${label}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => undefined);
  console.log(`  📸 ${file}`);
}

/** Paystack renders checkout inside an iframe on some flows and top-level on others. */
function paystackScopes(page) {
  return [page, ...page.frames().filter((f) => /paystack/i.test(f.url()))];
}

async function fillFirst(page, selectors, value, label) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    for (const scope of paystackScopes(page)) {
      for (const sel of selectors) {
        const loc = scope.locator(sel).first();
        if (await loc.isVisible().catch(() => false)) {
          await loc.click();
          await loc.pressSequentially(value, { delay: 40 });
          console.log(`  ✓ filled ${label}`);
          return true;
        }
      }
    }
    await page.waitForTimeout(500);
  }
  console.log(`  – no ${label} field shown`);
  return false;
}

async function clickFirst(page, patterns, label, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const scope of paystackScopes(page)) {
      for (const re of patterns) {
        const btn = scope.getByRole("button", { name: re }).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          console.log(`  ✓ clicked ${label}`);
          return true;
        }
      }
    }
    await page.waitForTimeout(500);
  }
  console.log(`  – no ${label} button shown`);
  return false;
}

async function main() {
  console.log(`Relief Hotels test booking → ${BASE_URL}`);
  console.log(`Guest email: ${EMAIL}`);

  // Guard: never run against live payments.
  const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
  console.log(`  health: paystackMode=${health.paystackMode} emailConfigured=${health.emailConfigured} storage=${health.storage?.mode}`);
  if (health.paystackMode !== "test" && !health.demoMode) {
    throw new Error(`Refusing to run: paystackMode is "${health.paystackMode}", not "test"`);
  }
  if (!health.emailConfigured) {
    console.warn("  ⚠ emailConfigured=false — the booking will succeed but NO email will reach the guest inbox.");
  }

  // Far-future dates keep the test booking away from real near-term inventory.
  const checkInDate = new Date();
  checkInDate.setUTCDate(checkInDate.getUTCDate() + 60);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setUTCDate(checkOutDate.getUTCDate() + NIGHTS);
  const checkIn = ymd(checkInDate);
  const checkOut = ymd(checkOutDate);

  const browser = await chromium.launch({ headless: !HEADED });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    console.log(`\n1. Open booking page (${ROOM_ID}, ${checkIn} → ${checkOut})`);
    await page.goto(`${BASE_URL}/en/book?type=room&id=${ROOM_ID}&checkIn=${checkIn}&checkOut=${checkOut}&guests=1`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("heading", { name: /complete your booking/i }).waitFor({ timeout: 45_000 });
    await snap(page, "book-page");

    console.log("2. Fill guest details");
    await page.getByLabel(/first name/i).fill("Test");
    await page.getByLabel(/last name/i).fill(`Automation${Date.now().toString().slice(-6)}`);
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/phone/i).fill("+2348030000099");
    await page.getByLabel(/agree to the booking terms/i).check();
    await snap(page, "details-filled");
    await page.getByRole("button", { name: /continue to payment/i }).click();

    console.log("3. Create reservation + start Paystack checkout");
    const payBtn = page.getByRole("button", { name: /pay deposit/i }).first();
    await payBtn.waitFor({ timeout: 20_000 });
    await snap(page, "payment-step");
    const [createRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/reservations") && r.request().method() === "POST", { timeout: 30_000 }),
      payBtn.click(),
    ]);
    const created = await createRes.json().catch(() => ({}));
    console.log(`  reservation: id=${created.id} emailSent=${created.emailSent}`);
    if (!created.id) throw new Error(`Reservation POST failed: ${JSON.stringify(created)}`);

    await page.waitForURL(/paystack|payment\/callback/i, { timeout: 45_000 });
    console.log(`  now at ${new URL(page.url()).host}`);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await snap(page, "paystack-checkout");

    if (/paystack/i.test(page.url()) && MANUAL_PAY) {
      console.log("4. Tick Cloudflare's \"Verify you are human\" in the browser window if it appears.");
      console.log("   The script then picks Paystack's test \"Success\" option and pays. Waiting up to 10 minutes…");
      // Paystack's test checkout lists Success / Bank Authentication / Declined.
      const success = page.getByText("Success", { exact: true }).first();
      await success.waitFor({ timeout: 600_000 });
      await snap(page, "paystack-test-options");
      await success.click();
      await page.getByRole("button", { name: /^pay ngn/i }).click();
      console.log("  ✓ chose Success and clicked Pay");
    } else if (/paystack/i.test(page.url())) {
      console.log("4. Pay with Paystack test card");
      await clickFirst(page, [/^card$/i, /pay with card/i], "card method", 5_000);
      await fillFirst(page, ['input[name="cardNumber"]', "#card-number", 'input[autocomplete="cc-number"]', 'input[placeholder*="0000"]'], CARD.number, "card number");
      await fillFirst(page, ['input[name="expiry"]', "#card-expiry", 'input[autocomplete="cc-exp"]', 'input[placeholder*="MM"]'], CARD.expiry, "expiry");
      await fillFirst(page, ['input[name="cvv"]', "#card-cvv", 'input[autocomplete="cc-csc"]', 'input[placeholder*="123"]'], CARD.cvv, "cvv");
      await snap(page, "card-filled");
      await clickFirst(page, [/^pay/i], "pay");

      // Test card 4084…4081 may prompt for PIN and/or OTP depending on Paystack's current flow.
      if (await fillFirst(page, ['input[name="pin"]', 'input[type="password"]', 'input[autocomplete="one-time-code"]'], CARD.pin, "PIN")) {
        await clickFirst(page, [/continue|authorize|submit/i], "PIN submit", 5_000);
      }
      if (await fillFirst(page, ['input[name="otp"]', 'input[placeholder*="OTP" i]', 'input[inputmode="numeric"]'], CARD.otp, "OTP")) {
        await clickFirst(page, [/authorize|submit|continue/i], "OTP submit", 5_000);
      }
    }

    console.log("5. Wait for callback");
    await page.waitForURL(/payment\/callback/i, { timeout: 90_000 });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(3_000);
    await snap(page, "callback");
    const reference = new URL(page.url()).searchParams.get("reference");
    const bodyText = (await page.locator("body").innerText()).slice(0, 400).replace(/\s+/g, " ");
    console.log(`  reference: ${reference}`);
    console.log(`  page says: ${bodyText}`);

    const verify = await page.request.get(`${BASE_URL}/api/paystack/verify?reference=${encodeURIComponent(reference ?? "")}`);
    const verifyBody = await verify.json().catch(() => ({}));
    console.log(`  verify: ${verify.status()} ${JSON.stringify(verifyBody).slice(0, 300)}`);

    console.log(`\n✓ Test booking done — reservation ${created.id}, reference ${reference}`);
    console.log(`  Screenshots: ${runDir}`);
  } catch (err) {
    await snap(page, "failure");
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  console.error(`  Screenshots: ${runDir}`);
  process.exit(1);
});
