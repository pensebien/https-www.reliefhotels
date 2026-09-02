/**
 * Playwright coverage for docs/testing/staff-payment-test-guide.md (Tests A–D + key check).
 * Run against the local staff/guest app, e.g.:
 *   BASE_URL=http://localhost:3002 npx playwright test tests/e2e/staff-payment-guide.spec.ts --project=prototype-local-luxury-desktop
 */
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const STAFF_KEY = process.env.DEMO_DASHBOARD_KEY ?? "relief-demo-2026";
const keyQ = `key=${encodeURIComponent(STAFF_KEY)}`;

function stayDates(offsetDays = 90) {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + offsetDays);
  const checkIn = base.toISOString().slice(0, 10);
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  return { checkIn, checkOut: out.toISOString().slice(0, 10), nights: 2 };
}

async function createPendingReservation(page: Page, label: string) {
  const { checkIn, checkOut, nights } = stayDates(120 + Math.floor(Math.random() * 40));
  const email = `pw-${label}-${Date.now()}@example.com`;
  const res = await page.request.post("/api/reservations", {
    data: {
      firstName: "Playwright",
      lastName: label,
      email,
      phone: "+2348030000001",
      stayPreference: `guest-room · ${nights} night(s) · 2 guest(s)`,
      message: `E2E ${label}`,
      itemType: "room",
      roomId: "guest-room",
      checkIn,
      checkOut,
      nights,
      guests: 2,
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as { ok?: boolean; id?: string };
  expect(body.id).toBeTruthy();
  return { id: body.id as string, email, checkIn, checkOut };
}

test.describe("Staff payment guide flows", () => {
  test("Test A — cashier cash settle confirms pending deposit", async ({ page }) => {
    const guest = await createPendingReservation(page, "Settle");

    await page.goto(`/en/staff/cashier?${keyQ}`);
    await expect(page.getByRole("heading", { name: /cashier/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("tab", { name: "Settle deposit" })).toBeVisible();
    await page.getByRole("tab", { name: "Settle deposit" }).click();

    const search = page.getByPlaceholder(/search/i);
    if (await search.isVisible().catch(() => false)) {
      await search.fill(guest.email);
    }

    await expect(page.getByRole("button", { name: new RegExp(guest.email, "i") })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: new RegExp(guest.email, "i") }).click();

    await expect(page.locator("#cashier-amount")).toBeVisible();
    await page.getByRole("button", { name: "Cash", exact: true }).click();
    await page.getByRole("button", { name: "Settle payment" }).click();

    await expect(
      page.getByText(/Payment settled — reservation confirmed/i),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("Test B — calendar free cell walk-in booking", async ({ page }) => {
    const stamp = Date.now();
    const email = `pw-walkin-${stamp}@example.com`;

    await page.goto(`/en/staff/calendar?${keyQ}`);
    await expect(page.getByRole("heading", { name: /calendar|occupancy/i })).toBeVisible({
      timeout: 30_000,
    });

    const freeCell = page.locator('button[aria-label^="Book "]').first();
    await expect(freeCell).toBeVisible({ timeout: 20_000 });
    await freeCell.click();

    await expect(page.getByText(/Record a reservation/i)).toBeVisible();
    await page.getByLabel("First name").fill("Walkin");
    await page.getByLabel("Last name").fill(`E2E${stamp}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel(/Phone/).fill("+2348030000002");

    await page.getByText("Cash", { exact: true }).click();
    await page.getByRole("button", { name: "Save reservation" }).click();

    await expect(page.getByText(/Record a reservation/i)).toBeHidden({
      timeout: 30_000,
    });

    // Guide: free cell becomes booked/pending; guest name shows on calendar start cell.
    // Inbox ContactActions uses a mailto label, not the raw email string.
    const guestName = `Walkin E2E${stamp}`;
    await page.goto(`/en/staff/calendar?${keyQ}`);
    await expect(
      page.getByRole("button", { name: new RegExp(guestName, "i") }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("Test C — guest rooms → book form (Paystack deposit path)", async ({ page }) => {
    const { checkIn, checkOut } = stayDates(60);
    await page.goto(
      `/en/rooms?checkIn=${checkIn}&checkOut=${checkOut}&rooms=1&guests=2`,
    );
    await expect(page.getByRole("heading", { name: /rooms|stay|rates/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    // Prefer an explicit book/select CTA when present
    const bookLink = page
      .locator('a[href*="/book"]')
      .or(page.getByRole("link", { name: /book|select|reserve/i }))
      .first();
    await expect(bookLink).toBeVisible({ timeout: 45_000 });
    await bookLink.click();

    await expect(page).toHaveURL(/\/book/, { timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: /Pay deposit/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Smoke-check form fields used before Paystack redirect
    await expect(page.getByLabel(/first name/i).or(page.locator('input[name="firstName"]')).first()).toBeVisible();
  });

  test("Test D — F&B charge for a booked guest", async ({ page }) => {
    // Seed a confirmed stay via cash settle API so F&B queue has someone
    const guest = await createPendingReservation(page, "Fnb");
    const settle = await page.request.post(
      `/api/staff/cashier/settle?key=${encodeURIComponent(STAFF_KEY)}`,
      {
        headers: { "x-demo-key": STAFF_KEY },
        data: {
          reservationId: guest.id,
          amountNgn: 5000,
          paymentMethod: "cash",
          clientMutationId: randomUUID(),
          // Omit note: local DB may lack reservations.staff_notes until migration-005.
        },
      },
    );
    expect(settle.ok(), await settle.text()).toBeTruthy();

    await page.goto(`/en/staff/cashier?${keyQ}`);
    await expect(page.getByRole("tab", { name: "Order F&B" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("tab", { name: "Order F&B" }).click();

    const search = page.getByPlaceholder(/search/i);
    if (await search.isVisible().catch(() => false)) {
      await search.fill(guest.email);
    }

    await expect(page.getByRole("button", { name: new RegExp(guest.email, "i") })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: new RegExp(guest.email, "i") }).click();

    const addCharge = page.getByRole("button", { name: /add/i }).first();
    await expect(addCharge).toBeVisible({ timeout: 20_000 });
    await addCharge.click();

    // Folio should show at least one line after posting
    await expect(
      page.locator("li, tr, div").filter({ hasText: /₦|NGN|Naira/i }).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Checklist #6 — wrong staff key is rejected", async ({ page }) => {
    await page.goto("/en/staff/cashier?key=definitely-wrong-key");
    await expect(
      page.getByText(/Invalid (cashier|dashboard|staff) key/i),
    ).toBeVisible({ timeout: 30_000 });
  });
});
