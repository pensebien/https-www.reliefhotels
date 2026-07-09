import type { Locator, Page } from "@playwright/test";

/** Random pause — mimics reading / deciding before the next action. */
export async function humanPause(page: Page, minMs = 250, maxMs = 900) {
  const delay = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
  await page.waitForTimeout(delay);
}

/** Scroll element into view, pause, then click. */
export async function humanClick(locator: Locator) {
  const page = locator.page();
  await locator.scrollIntoViewIfNeeded();
  await humanPause(page, 120, 450);
  await locator.click();
}

/** Type like a human — character by character with jitter. */
export async function humanType(locator: Locator, text: string) {
  const page = locator.page();
  await locator.click();
  await humanPause(page, 80, 200);
  await locator.fill("");
  for (const char of text) {
    await locator.pressSequentially(char, {
      delay: 35 + Math.floor(Math.random() * 55),
    });
  }
}

/** Slow scroll down the page as if scanning content. */
export async function humanScan(page: Page, steps = 3) {
  for (let i = 0; i < steps; i += 1) {
    await page.mouse.wheel(0, 180 + Math.floor(Math.random() * 220));
    await humanPause(page, 200, 600);
  }
}
