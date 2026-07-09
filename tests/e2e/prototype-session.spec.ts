import { expect, test } from "@playwright/test";
import { humanClick, humanPause, humanScan, humanType } from "./helpers/human";
import {
  inferWouldBook,
  runTimed,
  scoreUsability,
  writeSessionResult,
  type SessionResult,
  type TaskResult,
} from "./helpers/session-report";

const CHECK_IN = "2026-09-10";
const CHECK_OUT = "2026-09-12";
const DEMO_KEY = process.env.DEMO_DASHBOARD_KEY ?? "relief-demo-2026";

function guestIdentity(personaId: string, profile: string) {
  const stamp = Date.now().toString(36);
  const firstName =
    profile === "corporate"
      ? "Chidi"
      : profile === "international"
        ? "Sarah"
        : "Ada";
  const lastName =
    profile === "corporate"
      ? "Okonkwo"
      : profile === "international"
        ? "Mitchell"
        : "Eze";
  const email = `prototype.${personaId.toLowerCase()}.${stamp}@relief-test.example`;
  return { firstName, lastName, email, fullName: `${firstName} ${lastName}` };
}

test.describe.configure({ mode: "serial" });

test("prototype validation session (6 tasks)", async ({ page }, testInfo) => {
  const meta = testInfo.project.metadata as {
    personaId: string;
    personaProfile: string;
    personaDevice: string;
  };
  const { personaId, personaProfile, personaDevice } = meta;
  const startedAt = new Date().toISOString();
  const guest = guestIdentity(personaId, personaProfile);
  const tasks: TaskResult[] = [];

  async function recordTask(
    id: string,
    name: string,
    pass: boolean,
    durationMs: number,
    notes?: string,
  ) {
    tasks.push({ id, name, pass, durationMs, notes });
  }

  // ── Task 1: First impression ─────────────────────────────────────────────
  try {
    const { durationMs } = await runTimed(async () => {
      await page.goto("/en");
      await humanScan(page, 2);
      await expect(page.getByRole("heading", { name: /Relief Hotels/i }).first()).toBeVisible();
      const body = await page.locator("body").innerText();
      const premiumSignal =
        /calabar|luxury|suites|hospitality/i.test(body) &&
        /relief hotels/i.test(body);
      expect(premiumSignal).toBeTruthy();
    });
    await recordTask(
      "task-1",
      "First impression",
      true,
      durationMs,
      "Homepage conveys luxury hotel in Calabar",
    );
  } catch (error) {
    await recordTask(
      "task-1",
      "First impression",
      false,
      0,
      error instanceof Error ? error.message : "Homepage failed premium signal check",
    );
  }

  // ── Task 2: Room discovery ───────────────────────────────────────────────
  try {
    const { durationMs } = await runTimed(async () => {
      await page.goto(`/en/rooms?category=suites&checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}&guests=2`);
      await humanPause(page);
      const payDeposit = page.getByRole("link", { name: /pay deposit/i }).first();
      await expect(payDeposit).toBeVisible();
      await humanClick(payDeposit);
      await expect(page).toHaveURL(/\/book/);
      await expect(page.locator("#res-firstName")).toBeVisible();
      const body = await page.locator("body").innerText();
      expect(/deposit|₦|ngn|night/i.test(body)).toBeTruthy();
    });
    await recordTask("task-2", "Room discovery", true, durationMs, "Reached book page with deposit context");
  } catch (error) {
    await recordTask(
      "task-2",
      "Room discovery",
      false,
      0,
      error instanceof Error ? error.message : "Room discovery failed",
    );
  }

  // ── Task 3: Booking / deposit flow ───────────────────────────────────────
  try {
    const { durationMs } = await runTimed(async () => {
      if (!page.url().includes("/book")) {
        await page.goto(
          `/en/book?type=room&id=signature-suite&checkIn=${CHECK_IN}&checkOut=${CHECK_OUT}&guests=2`,
        );
      }

      await humanType(page.locator("#res-firstName"), guest.firstName);
      await humanType(page.locator("#res-lastName"), guest.lastName);
      await humanType(page.locator("#res-email"), guest.email);
      await humanType(page.locator("#res-phone"), "+234 803 000 0001");
      await humanClick(page.locator("#res-terms"));

      const continueBtn = page.getByRole("button", { name: /^pay deposit$/i }).first();
      await humanClick(continueBtn);
      await humanPause(page, 400, 900);

      const payBtn = page.getByRole("button", { name: /pay deposit with paystack/i });
      await expect(payBtn).toBeVisible();
      const summary = await page.locator("body").innerText();
      expect(/deposit|₦/i.test(summary)).toBeTruthy();

      await humanClick(payBtn);
      await page.waitForURL(/\/payment\/callback/, {
        timeout: 60_000,
        waitUntil: "domcontentloaded",
      });
      await expect(page.getByRole("heading", { name: /payment successful/i })).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.locator("code").first()).toBeVisible();
    });
    await recordTask(
      "task-3",
      "Booking / deposit",
      true,
      durationMs,
      `Demo payment success for ${guest.email}`,
    );
  } catch (error) {
    await recordTask(
      "task-3",
      "Booking / deposit",
      false,
      0,
      error instanceof Error ? error.message : "Booking flow failed",
    );
  }

  // ── Task 4: Event / dining inquiry ───────────────────────────────────────
  try {
    const { durationMs } = await runTimed(async () => {
      if (personaProfile === "corporate") {
        await page.goto("/en/events");
        await humanScan(page, 2);
        const form = page.locator("#event-inquiry form");
        await form.scrollIntoViewIfNeeded();
        await humanType(form.locator('input[name="firstName"]'), guest.firstName);
        await humanType(form.locator('input[name="lastName"]'), guest.lastName);
        await humanType(form.locator('input[name="email"]'), guest.email);
        await humanType(form.locator('input[name="phone"]'), "+234 803 000 0002");
        await form.locator('select[name="eventType"]').selectOption("corporate");
        await form.locator('input[name="eventDate"]').fill("2026-10-15");
        await humanType(form.locator('input[name="guestCount"]'), "40");
        await humanType(
          form.locator('textarea[name="message"]'),
          "Corporate dinner for 40 guests — need AV and set menus.",
        );
        await humanClick(form.getByRole("button", { type: "submit" }));
      } else {
        await page.goto("/en/dine-wine");
        await humanScan(page, 2);
        const form = page.locator("#dining-reservation form");
        await form.scrollIntoViewIfNeeded();
        await humanType(form.locator('input[name="firstName"]'), guest.firstName);
        await humanType(form.locator('input[name="lastName"]'), guest.lastName);
        await humanType(form.locator('input[name="email"]'), guest.email);
        await form.locator('select[name="venue"]').selectOption({ index: 1 });
        await form.locator('input[name="reservationDate"]').fill("2026-10-12");
        await form.locator('input[name="reservationTime"]').fill("19:30");
        await humanType(form.locator('input[name="partySize"]'), "4");
        await humanType(
          form.locator('textarea[name="notes"]'),
          "Window table for anniversary dinner.",
        );
        await humanClick(form.getByRole("button", { type: "submit" }));
      }
      await expect(page.getByText(/thank|received|success|team will/i).first()).toBeVisible({
        timeout: 20_000,
      });
    });
    await recordTask(
      "task-4",
      personaProfile === "corporate" ? "Event inquiry" : "Dining inquiry",
      true,
      durationMs,
    );
  } catch (error) {
    await recordTask(
      "task-4",
      "Event / dining inquiry",
      false,
      0,
      error instanceof Error ? error.message : "Inquiry form failed",
    );
  }

  // ── Task 5: Concierge fallback (contact) ─────────────────────────────────
  try {
    const { durationMs } = await runTimed(async () => {
      await page.goto("/en#contact");
      await humanPause(page);
      const contact = page.locator("#contact");
      const phone = contact.getByRole("link", { name: /803 326 2719/i }).first();
      const email = contact
        .getByRole("link", { name: /reservations@reliefhotelsandsuites/i })
        .first();
      await expect(phone).toBeVisible();
      await expect(email).toBeVisible();
    });
    await recordTask("task-5", "Concierge contact", true, durationMs);
  } catch (error) {
    await recordTask(
      "task-5",
      "Concierge contact",
      false,
      0,
      error instanceof Error ? error.message : "Contact details not found",
    );
  }

  // ── Task 6: Language + mobile layout ─────────────────────────────────────
  try {
    const { durationMs } = await runTimed(async () => {
      if (personaDevice === "mobile") {
        // Language switcher is desktop header only — direct locale route still validates i18n.
        await page.goto("/fr/rooms");
        await page.waitForURL(/\/fr\/rooms/);
      } else {
        await page.goto("/en/rooms");
        const switcher = page.getByLabel(/language/i);
        await expect(switcher).toBeVisible();
        await switcher.selectOption("fr");
        await page.waitForURL(/\/fr\//);
      }
      await expect(page.locator("body")).toBeVisible();
      const text = await page.locator("body").innerText();
      expect(text.length).toBeGreaterThan(100);
      if (personaDevice === "mobile") {
        const box = await page.locator("body").boundingBox();
        expect(box?.width ?? 0).toBeLessThanOrEqual(430);
      }
    });
    await recordTask(
      "task-6",
      "Language & mobile",
      true,
      durationMs,
      personaDevice === "mobile" ? "FR rooms route on mobile viewport" : "Switched to FR locale",
    );
  } catch (error) {
    await recordTask(
      "task-6",
      "Language & mobile",
      false,
      0,
      error instanceof Error ? error.message : "Locale or mobile check failed",
    );
  }

  // ── Ops check: reservation stored and visible to staff ───────────────────
  if (tasks.find((t) => t.id === "task-3")?.pass) {
    try {
      const activityRes = await page.request.get(
        `/api/demo/activity?key=${encodeURIComponent(DEMO_KEY)}`,
      );
      expect(activityRes.ok()).toBeTruthy();
      const activity = (await activityRes.json()) as {
        reservations: { email: string; firstName: string; lastName: string }[];
      };
      const found = activity.reservations.some((r) => r.email === guest.email);
      expect(found).toBeTruthy();
      await recordTask(
        "task-ops",
        "Dashboard API visibility",
        true,
        0,
        `Reservation ${guest.email} in activity feed`,
      );
    } catch {
      await recordTask(
        "task-ops",
        "Dashboard API visibility",
        false,
        0,
        "Reservation not found in /api/demo/activity",
      );
    }
  }

  const coreTasks = tasks.filter((t) => t.id.startsWith("task-") && t.id !== "task-ops");
  const tasksPassed = coreTasks.filter((t) => t.pass).length;
  const session: SessionResult = {
    participantId: personaId,
    profile: personaProfile,
    device: personaDevice,
    automated: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    tasks,
    tasksPassed,
    usabilityScore: scoreUsability(tasksPassed),
    wouldBook: inferWouldBook(tasksPassed),
    guestEmail: guest.email,
    guestName: guest.fullName,
  };

  writeSessionResult(session);

  expect(tasksPassed, `Session ${personaId} passed ${tasksPassed}/6 core tasks`).toBeGreaterThanOrEqual(5);
});
