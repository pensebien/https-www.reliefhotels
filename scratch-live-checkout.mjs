import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(
  "https://www.reliefhotelsandsuites.com/en/book?type=room&id=guest-room&checkIn=2026-11-10&checkOut=2026-11-12&guests=1",
  { waitUntil: "networkidle" },
);

await page.getByLabel(/first name/i).fill("Claude");
await page.getByLabel(/last name/i).fill("TestVerification");
await page.getByLabel(/email/i).fill("claude-paystack-live-test@example.com");
await page.getByLabel(/phone/i).fill("+2348012340000");
await page.getByLabel(/i agree to the booking terms/i).check();
await page.getByRole("button", { name: /continue to payment/i }).click();
await page.waitForTimeout(1000);

await Promise.all([
  page.waitForURL(/paystack/i, { timeout: 20000 }).catch(() => null),
  page.getByRole("button", { name: /pay deposit with paystack/i }).click(),
]);

console.log("initial url:", page.url());

// Give Cloudflare's automated challenge a real chance to clear on its own.
await page.waitForTimeout(12000);
console.log("url after wait:", page.url());
await page.screenshot({ path: "/tmp/live-paystack-page2.png", fullPage: true });

await browser.close();
