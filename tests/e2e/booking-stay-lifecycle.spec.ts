/**
 * Playwright coverage for the full room lifecycle described in
 * docs/guides/site-qa-guide.md §2 (booking & payment) and §3 (staff portal):
 *
 *   guest books a room (pending) -> cashier/manager settles the deposit
 *   (confirmed) -> the room disappears from the public availability search
 *   -> front desk checks the guest out -> housekeeping clears the room ->
 *   the room reappears in availability once its booked dates have passed.
 *
 * Findings on the open question ("how does the system record that a guest
 * has left / did not extend their stay?"):
 *
 *   - There is NO automatic detection of guest departure anywhere in the
 *     codebase (no schema field, no cron, no date-based auto-checkout).
 *     "Checked out" only ever happens because a cashier/manager clicks
 *     "Check out" on a confirmed booking in /staff/calendar, which PATCHes
 *     the reservation to status="checked_out"
 *     (src/app/api/demo/reservations/[id]/route.ts).
 *   - That PATCH does NOT free the room's inventory for its originally
 *     booked dates: src/lib/db/inventory-store.ts#countOccupiedUnits only
 *     excludes reservations with status "cancelled" — a "checked_out"
 *     reservation still counts as occupying its checkIn..checkOut range.
 *     The room only reappears in availability once a query's date range no
 *     longer overlaps that stored checkOut date — i.e. availability is
 *     purely a function of the calendar date, not of any "guest left" flag.
 *   - The one side effect checkout *does* have is spawning a same-day
 *     "housekeeping" room block (today -> tomorrow) so the room can't be
 *     re-sold for a walk-in before it's cleaned. That block has to be
 *     cleared by a cleaner_head on /staff/housekeeping ("Mark clean") —
 *     see the assertions below that prove the room is still unavailable
 *     for its original dates even after that block is cleared.
 *   - There is no "extend stay" feature anywhere (staffReservationPatchSchema
 *     only accepts status + staffNotes; no route or UI edits checkIn/checkOut
 *     on an existing reservation), so today the only way to keep a room
 *     longer is a brand-new reservation for the extra nights.
 *
 * Run against a local dev server, e.g.:
 *   BASE_URL=http://localhost:3002 npx playwright test tests/e2e/booking-stay-lifecycle.spec.ts --project=prototype-local-luxury-desktop
 */
import { expect, test, type Page } from "@playwright/test";

const STAFF_KEY = process.env.DEMO_DASHBOARD_KEY ?? "relief-demo-2026";
const keyQ = `key=${encodeURIComponent(STAFF_KEY)}`;

// Presidential Suite has exactly one physical unit in DEFAULT_INVENTORY
// (src/lib/db/inventory-store.ts), so a single booking is enough to push it
// to zero free units and make the removal-from-availability assertion
// unambiguous instead of relying on a partial unit count.
const ROOM_ID = "presidential-suite";
const ROOM_LABEL = "Penthouse Suite"; // messages/en.json rooms.presidential.name

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function datesOverlap(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return aIn < bOut && bIn < aOut;
}

async function getAvailability(page: Page, checkIn: string, checkOut: string) {
  const res = await page.request.get(
    `/api/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}&rooms=1&guests=1`,
  );
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()) as {
    available: Array<{ id: string; availableUnits: number }>;
  };
}

function isRoomAvailable(
  body: { available: Array<{ id: string; availableUnits: number }> },
  roomId: string,
): boolean {
  return body.available.some((r) => r.id === roomId && r.availableUnits > 0);
}

/**
 * Best-effort idempotency: cancel any non-cancelled reservation and clear
 * any room block this suite already has over [today, tomorrow) from a
 * previous interrupted run, so the "available before booking" assertion
 * below is reliable on repeated local runs.
 */
async function resetRoomForToday(page: Page, today: string, tomorrow: string) {
  const activity = await page.request.get(`/api/demo/activity?${keyQ}`);
  if (activity.ok()) {
    const body = (await activity.json()) as {
      reservations?: Array<{
        id: string;
        roomId?: string;
        itemType?: string;
        status: string;
        checkIn?: string;
        checkOut?: string;
        source?: string;
      }>;
    };
    for (const r of body.reservations ?? []) {
      if (
        r.itemType === "room" &&
        r.roomId === ROOM_ID &&
        r.status !== "cancelled" &&
        r.source !== "demo" &&
        r.checkIn &&
        r.checkOut &&
        datesOverlap(r.checkIn, r.checkOut, today, tomorrow)
      ) {
        await page.request
          .patch(`/api/demo/reservations/${r.id}?${keyQ}`, {
            data: { status: "cancelled" },
          })
          .catch(() => undefined);
      }
    }
  }

  const blocks = await page.request.get(`/api/staff/room-blocks?${keyQ}`);
  if (blocks.ok()) {
    const body = (await blocks.json()) as {
      blocks?: Array<{ id: string; roomId: string; checkIn: string; checkOut: string }>;
    };
    for (const b of body.blocks ?? []) {
      if (b.roomId === ROOM_ID && datesOverlap(b.checkIn, b.checkOut, today, tomorrow)) {
        await page.request.delete(`/api/staff/room-blocks/${b.id}?${keyQ}`).catch(() => undefined);
      }
    }
  }
}

test.describe("Room lifecycle: guest stay end-to-end", () => {
  test("booking removes the room from availability; checkout + housekeeping govern when it comes back", async ({
    page,
  }) => {
    const today = ymd(new Date());
    const tomorrow = ymd(addDays(new Date(), 1));
    const dayAfter = ymd(addDays(new Date(), 2));
    const lastName = `Lifecycle${Date.now()}`;
    const email = `pw-lifecycle-${Date.now()}@example.com`;

    await resetRoomForToday(page, today, tomorrow);

    // --- 1. Before anyone books: the suite is in the public availability list ---
    const before = await getAvailability(page, today, tomorrow);
    expect(
      isRoomAvailable(before, ROOM_ID),
      "Presidential Suite should start available for today→tomorrow — rerun after clearing data/*.json if this fails",
    ).toBeTruthy();

    // --- 2. Guest books via the real /book UI (Test C in staff-payment-guide.spec.ts
    //     stops here too — we go one step further and let the reservation POST
    //     actually happen, then block only the outbound Paystack redirect so the
    //     test never leaves localhost. This mirrors the guide's "pay at desk"
    //     path: the guest fills the form, and front desk settles cash later. ---
    await page.route("**/api/paystack/initialize", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ error: "blocked in e2e test" }),
      }),
    );

    await page.goto(
      `/en/book?id=${ROOM_ID}&checkIn=${today}&checkOut=${tomorrow}&guests=1`,
    );
    await expect(page.getByRole("heading", { name: /complete your booking/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel("First name").fill("Playwright");
    await page.getByLabel("Last name").fill(lastName);
    await page.getByLabel("Email for receipt").fill(email);
    await page.getByLabel(/phone/i).fill("+2348030000099");
    await page.getByLabel(/agree to the booking terms/i).check();
    await page.getByRole("button", { name: "Continue to payment" }).click();

    await expect(page.getByRole("button", { name: /pay deposit/i })).toBeVisible({
      timeout: 15_000,
    });

    const [createRes] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/reservations") && r.request().method() === "POST",
      ),
      page.getByRole("button", { name: /pay deposit/i }).click(),
    ]);
    const created = (await createRes.json()) as { ok?: boolean; id?: string };
    expect(created.id).toBeTruthy();
    const reservationId = created.id as string;

    // --- 3. The room is already gone from availability the moment the
    //     (still-pending, unpaid) reservation exists — inventory is held on
    //     request, not on payment. Only a cancelled reservation is excluded
    //     (src/lib/db/inventory-store.ts#countOccupiedUnits). ---
    const afterPendingBooking = await getAvailability(page, today, tomorrow);
    expect(isRoomAvailable(afterPendingBooking, ROOM_ID)).toBeFalsy();

    // --- 4. Cashier/manager settles the deposit in cash (front-desk payment flow) ---
    await page.goto(`/en/staff/cashier?${keyQ}`);
    await expect(page.getByRole("heading", { name: /cashier/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("tab", { name: "Settle deposit" }).click();

    const search = page.getByPlaceholder(/search/i);
    if (await search.isVisible().catch(() => false)) {
      await search.fill(email);
    }
    await expect(page.getByRole("button", { name: new RegExp(email, "i") })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: new RegExp(email, "i") }).click();

    await expect(page.locator("#cashier-amount")).toBeVisible();
    // The button's accessible name is "Cash Guest paid in cash" (label + subtitle
    // in one control), so an exact "Cash" match never resolves — match the prefix.
    // Clicking it settles immediately; there's no separate confirm button.
    await page.getByRole("button", { name: /^Cash\b/i }).click();
    await expect(page.getByText(/Payment settled — reservation confirmed/i)).toBeVisible({
      timeout: 30_000,
    });

    // Confirming payment doesn't change occupancy — it was already held pending.
    const afterConfirm = await getAvailability(page, today, tomorrow);
    expect(isRoomAvailable(afterConfirm, ROOM_ID)).toBeFalsy();

    // --- 5. Front desk checks the guest out from the staff calendar ---
    await page.goto(`/en/staff/calendar?${keyQ}`);
    await expect(page.getByRole("heading", { name: /calendar|occupancy/i })).toBeVisible({
      timeout: 30_000,
    });

    // The occupancy table paginates 8 rows at a time across all 31 units;
    // Presidential Suite (category "penthouse") isn't guaranteed to be on
    // page 1. Filter to its category chip so its single row is always shown.
    await page.getByRole("button", { name: "Penthouse", exact: true }).click();

    const bookingCell = page.getByRole("button", { name: new RegExp(lastName, "i") });
    await expect(bookingCell).toBeVisible({ timeout: 20_000 });
    await bookingCell.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    page.once("dialog", (d) => d.accept()); // window.confirm("Check out this guest? ...")
    const [checkoutRes] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/demo/reservations/${reservationId}`) &&
          r.request().method() === "PATCH",
      ),
      page.getByRole("button", { name: "Check out" }).click(),
    ]);
    const checkoutBody = (await checkoutRes.json()) as {
      reservation: { status: string };
      housekeeping: { id: string; roomId: string; blockType: string } | null;
    };
    expect(checkoutBody.reservation.status).toBe("checked_out");
    expect(checkoutBody.housekeeping).toBeTruthy();
    expect(checkoutBody.housekeeping?.roomId).toBe(ROOM_ID);
    expect(checkoutBody.housekeeping?.blockType).toBe("housekeeping");
    const housekeepingBlockId = checkoutBody.housekeeping!.id;

    // Checkout alone does not free the room for its original dates: the
    // checked_out reservation still overlaps today→tomorrow, and the fresh
    // housekeeping block does too.
    const afterCheckout = await getAvailability(page, today, tomorrow);
    expect(isRoomAvailable(afterCheckout, ROOM_ID)).toBeFalsy();

    // --- 6. Cleaner clears the room in /staff/housekeeping ---
    await page.goto(`/en/staff/housekeeping?${keyQ}`);
    await expect(page.getByRole("heading", { name: /room readiness/i })).toBeVisible({
      timeout: 30_000,
    });

    const housekeepingRow = page
      .locator("li")
      .filter({ hasText: ROOM_LABEL })
      .filter({ hasText: /guest checked out/i });
    await expect(housekeepingRow).toBeVisible({ timeout: 20_000 });
    await housekeepingRow.getByRole("button", { name: /mark clean/i }).click();
    await expect(housekeepingRow).toBeHidden({ timeout: 20_000 });

    const blockCheck = await page.request.get(`/api/staff/room-blocks?${keyQ}`);
    const blockBody = (await blockCheck.json()) as { blocks: Array<{ id: string }> };
    expect(blockBody.blocks.some((b) => b.id === housekeepingBlockId)).toBeFalsy();

    // --- 7. Even fully cleaned, the room is STILL unavailable for its
    //     original booked dates — the checked_out reservation record itself
    //     is the only remaining thing occupying today→tomorrow. This is the
    //     concrete evidence for the "no guest-departure tracking" finding
    //     above: nothing frees inventory except the calendar date rolling
    //     past the stored checkOut. ---
    const afterMarkClean = await getAvailability(page, today, tomorrow);
    expect(isRoomAvailable(afterMarkClean, ROOM_ID)).toBeFalsy();

    // --- 8. Query the day AFTER the booked stay ends: the room is back,
    //     purely because the date range no longer overlaps checkOut. ---
    const nextWindow = await getAvailability(page, tomorrow, dayAfter);
    expect(isRoomAvailable(nextWindow, ROOM_ID)).toBeTruthy();
  });
});
