# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: booking-stay-lifecycle.spec.ts >> Room lifecycle: guest stay end-to-end >> booking removes the room from availability; checkout + housekeeping govern when it comes back
- Location: tests/e2e/booking-stay-lifecycle.spec.ts:139:7

# Error details

```
TypeError: Cannot read properties of undefined (reading 'status')
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - navigation [ref=e3]:
      - link "Relief Hotels & Suites home" [ref=e4] [cursor=pointer]:
        - /url: /
        - generic [ref=e6]:
          - generic [ref=e7]: RELIEF
          - generic [ref=e8]: Hotels & Suites
      - generic [ref=e9]:
        - list [ref=e10]:
          - listitem [ref=e11]:
            - link "Home" [ref=e12] [cursor=pointer]:
              - /url: /#home
          - listitem [ref=e13]:
            - link "Rooms" [ref=e14] [cursor=pointer]:
              - /url: /rooms
          - listitem [ref=e15]:
            - link "Dining" [ref=e16] [cursor=pointer]:
              - /url: /dine-wine
          - listitem [ref=e17]:
            - link "Events and Meetings" [ref=e18] [cursor=pointer]:
              - /url: /events
          - listitem [ref=e19]:
            - link "Gallery" [ref=e20] [cursor=pointer]:
              - /url: /gallery
        - button "Experience" [ref=e22]:
          - text: Experience
          - img [ref=e23]
      - generic [ref=e25]:
        - generic [ref=e27]:
          - generic [ref=e28]: Language
          - combobox "Language" [ref=e29]:
            - option "English" [selected]
            - option "Français"
            - option "Pidgin"
            - option "Igbo"
            - option "Yorùbá"
        - button "Toggle theme" [ref=e30]:
          - img [ref=e31]
        - button "Book Your Stay" [ref=e33]
  - main [ref=e34]:
    - generic [ref=e35]:
      - generic [ref=e37]:
        - navigation "Staff navigation" [ref=e38]:
          - link "Dashboard" [ref=e39] [cursor=pointer]:
            - /url: /staff?key=relief-demo-2026
          - link "Cashier" [ref=e40] [cursor=pointer]:
            - /url: /staff/cashier?key=relief-demo-2026
          - link "F&B" [ref=e41] [cursor=pointer]:
            - /url: /staff/fnb?key=relief-demo-2026
          - link "Calendar" [ref=e42] [cursor=pointer]:
            - /url: /staff/calendar?key=relief-demo-2026
        - generic [ref=e43]:
          - text: Role
          - combobox "Role" [ref=e44]:
            - option "Cashier" [selected]
            - option "Manager"
            - option "Restaurant Owner"
            - option "Cleaner Head"
      - generic [ref=e46]:
        - link "← Back to staff portal" [ref=e47] [cursor=pointer]:
          - /url: /staff?key=relief-demo-2026
        - generic [ref=e48]:
          - generic [ref=e49]:
            - paragraph [ref=e50]: Front desk
            - heading "Occupancy calendar" [level=1] [ref=e51]
            - paragraph [ref=e52]: Weekly room occupancy — tap a free cell to book a walk-in, or open a pending stay to mark it booked.
          - button "Refresh" [ref=e53]:
            - img [ref=e54]
            - text: Refresh
        - generic [ref=e59]:
          - textbox "Dashboard key" [ref=e60]: relief-demo-2026
          - button "Load calendar" [ref=e61] [cursor=pointer]
        - region "Room & event occupancy" [ref=e62]:
          - generic [ref=e63]:
            - generic [ref=e64]:
              - heading "Room & event occupancy" [level=2] [ref=e65]
              - paragraph [ref=e66]: Green = available · Teal = confirmed stay · Amber = pending · Violet = event inquiry · Slate = blocked (maintenance/housekeeping). Tap a free cell to book; tap a booking to manage.
            - generic [ref=e67]:
              - button "Previous week" [ref=e68] [cursor=pointer]:
                - img [ref=e69]
              - generic [ref=e71]: Sep 7 – Sep 13
              - button "Next week" [ref=e72] [cursor=pointer]:
                - img [ref=e73]
              - button "This week" [ref=e75] [cursor=pointer]
          - group "Filter units for this week (works with category chips)" [ref=e76]:
            - button "Available 6" [ref=e77] [cursor=pointer]:
              - text: Available
              - generic [ref=e78]: "6"
            - button "Occupied 1" [ref=e79] [cursor=pointer]:
              - text: Occupied
              - generic [ref=e80]: "1"
            - button "Pending 0" [ref=e81] [cursor=pointer]:
              - text: Pending
              - generic [ref=e82]: "0"
            - button "Blocked 0" [ref=e83] [cursor=pointer]:
              - text: Blocked
              - generic [ref=e84]: "0"
          - generic [ref=e85]:
            - button "All" [ref=e86] [cursor=pointer]
            - button "Guest rooms" [ref=e87] [cursor=pointer]:
              - img [ref=e88]
              - text: Guest rooms
            - button "Executive" [ref=e92] [cursor=pointer]:
              - img [ref=e93]
              - text: Executive
            - button "Suites" [ref=e97] [cursor=pointer]:
              - img [ref=e98]
              - text: Suites
            - button "Penthouse" [ref=e102] [cursor=pointer]:
              - img [ref=e103]
              - text: Penthouse
            - button "Pavilion & halls" [ref=e108] [cursor=pointer]:
              - img [ref=e109]
              - text: Pavilion & halls
          - table "Weekly occupancy by room and event space" [ref=e115]:
            - caption [ref=e116]: Weekly occupancy by room and event space
            - rowgroup [ref=e117]:
              - row "Unit 7 Mon 8 Tue 9 Wed 10 Thu 11 Fri 12 Sat 13 Sun" [ref=e118]:
                - columnheader "Unit" [ref=e119]
                - columnheader "7 Mon" [ref=e120]:
                  - generic [ref=e121]: 7 Mon
                - columnheader "8 Tue" [ref=e122]:
                  - generic [ref=e123]: 8 Tue
                - columnheader "9 Wed" [ref=e124]:
                  - generic [ref=e125]: 9 Wed
                - columnheader "10 Thu" [ref=e126]:
                  - generic [ref=e127]: 10 Thu
                - columnheader "11 Fri" [ref=e128]:
                  - generic [ref=e129]: 11 Fri
                - columnheader "12 Sat" [ref=e130]:
                  - generic [ref=e131]: 12 Sat
                - columnheader "13 Sun" [ref=e132]:
                  - generic [ref=e133]: 13 Sun
            - rowgroup [ref=e134]:
              - row "Penthouse Suite View booking for Playwright Lifecycle1788824862088 on 2026-09-07 Book Penthouse Suite starting 2026-09-08 Book Penthouse Suite starting 2026-09-09 Book Penthouse Suite starting 2026-09-10 Book Penthouse Suite starting 2026-09-11 Book Penthouse Suite starting 2026-09-12 Book Penthouse Suite starting 2026-09-13" [ref=e135]:
                - rowheader "Penthouse Suite" [ref=e136]:
                  - generic [ref=e137]:
                    - img [ref=e139]
                    - generic [ref=e144]: Penthouse Suite
                - cell "View booking for Playwright Lifecycle1788824862088 on 2026-09-07" [ref=e145]:
                  - button "View booking for Playwright Lifecycle1788824862088 on 2026-09-07" [ref=e146] [cursor=pointer]:
                    - generic [ref=e147]: Playwright Lifecycle1788824862088
                - cell "Book Penthouse Suite starting 2026-09-08" [ref=e148]:
                  - button "Book Penthouse Suite starting 2026-09-08" [ref=e149] [cursor=pointer]:
                    - generic [ref=e150]: +
                - cell "Book Penthouse Suite starting 2026-09-09" [ref=e151]:
                  - button "Book Penthouse Suite starting 2026-09-09" [ref=e152] [cursor=pointer]:
                    - generic [ref=e153]: +
                - cell "Book Penthouse Suite starting 2026-09-10" [ref=e154]:
                  - button "Book Penthouse Suite starting 2026-09-10" [ref=e155] [cursor=pointer]:
                    - generic [ref=e156]: +
                - cell "Book Penthouse Suite starting 2026-09-11" [ref=e157]:
                  - button "Book Penthouse Suite starting 2026-09-11" [ref=e158] [cursor=pointer]:
                    - generic [ref=e159]: +
                - cell "Book Penthouse Suite starting 2026-09-12" [ref=e160]:
                  - button "Book Penthouse Suite starting 2026-09-12" [ref=e161] [cursor=pointer]:
                    - generic [ref=e162]: +
                - cell "Book Penthouse Suite starting 2026-09-13" [ref=e163]:
                  - button "Book Penthouse Suite starting 2026-09-13" [ref=e164] [cursor=pointer]:
                    - generic [ref=e165]: +
          - paragraph [ref=e166]: Tap an empty (green) cell to start a walk-in booking. Tap amber/teal cells to view details and mark pending stays as booked.
          - dialog "Playwright Lifecycle1788824862088" [ref=e167]:
            - generic [ref=e168]:
              - generic [ref=e169]:
                - paragraph [ref=e170]: Room stay
                - heading "Playwright Lifecycle1788824862088" [level=2] [ref=e171]
              - button "Close booking details" [ref=e172]:
                - img [ref=e173]
            - generic [ref=e176]:
              - generic [ref=e177]:
                - paragraph [ref=e178]: Status
                - paragraph [ref=e179]: confirmed
              - generic [ref=e180]:
                - paragraph [ref=e181]: Room / space
                - paragraph [ref=e182]: room:presidential-suite · Penthouse Suite · 2026-09-07 → 2026-09-08 · 1 night · 1 guest
              - generic [ref=e183]:
                - paragraph [ref=e184]: Stay
                - paragraph [ref=e185]: Sep 7, 2026 → Sep 8, 2026
              - generic [ref=e186]:
                - paragraph [ref=e187]: Email
                - link "Send email to pw-lifecycle-1788824862088@example.com" [ref=e189] [cursor=pointer]:
                  - /url: mailto:pw-lifecycle-1788824862088@example.com
                  - text: pw-lifecycle-1788824862088@example.com
              - generic [ref=e190]:
                - paragraph [ref=e191]: Phone
                - link "Message on WhatsApp or call +2348030000099" [ref=e193] [cursor=pointer]:
                  - /url: https://wa.me/2348030000099
                  - text: "+2348030000099"
              - generic [ref=e194]:
                - paragraph [ref=e195]: Guests
                - paragraph [ref=e196]: "1"
              - generic [ref=e197]:
                - paragraph [ref=e198]: Payment ref
                - paragraph [ref=e199]: RH-CASH-20260907-20ac26
              - generic [ref=e200]:
                - paragraph [ref=e201]: Deposit paid
                - paragraph [ref=e202]: ₦84,000
              - generic [ref=e203]:
                - paragraph [ref=e204]: Stay preference
                - paragraph [ref=e205]: room:presidential-suite · Penthouse Suite · 2026-09-07 → 2026-09-08 · 1 night · 1 guest
              - generic [ref=e206]:
                - paragraph [ref=e207]: Reservation
                - paragraph [ref=e208]: 96eb87a0-5b2f-4da7-b635-7b417f41dc70
              - generic [ref=e209]:
                - paragraph [ref=e210]: Front desk actions
                - generic [ref=e211]:
                  - generic [ref=e212]:
                    - button "Check out" [ref=e213]
                    - button "Cancel booking" [ref=e214]
                  - generic [ref=e215]:
                    - text: Staff notes
                    - textbox "Staff notes" [ref=e216]:
                      - /placeholder: VIP arrival, late check-in, etc.
                  - button "Save notes" [ref=e217]
                  - paragraph [ref=e218]: new row for relation "reservations" violates check constraint "reservations_status_check"
  - contentinfo [ref=e219]:
    - generic [ref=e220]:
      - generic [ref=e221]:
        - generic [ref=e222]:
          - paragraph [ref=e225]: Relief Hotels & Suites
          - heading "Luxury hospitality shaped around your comfort." [level=2] [ref=e226]
          - paragraph [ref=e227]: Guest Rooms, Executive Rooms, Suites, and Penthouse stays — calm, personal, and memorable in the heart of Calabar.
          - button "Book your stay" [ref=e228]:
            - text: Book your stay
            - img [ref=e230]
        - generic [ref=e234]:
          - paragraph [ref=e235]: Explore
          - generic [ref=e236]:
            - link "Home" [ref=e237] [cursor=pointer]:
              - /url: /#home
            - link "Rooms" [ref=e238] [cursor=pointer]:
              - /url: /rooms
            - link "Dining" [ref=e239] [cursor=pointer]:
              - /url: /dine-wine
            - link "Events and Meetings" [ref=e240] [cursor=pointer]:
              - /url: /events
            - link "Gallery" [ref=e241] [cursor=pointer]:
              - /url: /gallery
            - button "Experience" [ref=e243]:
              - generic [ref=e244]: Experience
              - img [ref=e245]
            - button "Rooms & Suites" [ref=e248]:
              - generic [ref=e249]: Rooms & Suites
              - img [ref=e250]
            - link "Contact" [ref=e252] [cursor=pointer]:
              - /url: /#contact
        - generic [ref=e253]:
          - paragraph [ref=e254]: Contact
          - generic [ref=e255]:
            - generic [ref=e256]:
              - img [ref=e257]
              - link "+234 810 065 3664" [ref=e259] [cursor=pointer]:
                - /url: tel:+2348100653664
            - generic [ref=e260]:
              - img [ref=e261]
              - link "WhatsApp · +234 810 065 3664" [ref=e263] [cursor=pointer]:
                - /url: https://wa.me/2348100653664?text=Hello%20Relief%20Hotels%20%26%20Suites%20%E2%80%94%20I%E2%80%99d%20like%20help%20with%20a%20stay.
            - generic [ref=e264]:
              - img [ref=e265]
              - link "reservations@reliefhotelsandsuites.com" [ref=e268] [cursor=pointer]:
                - /url: mailto:reservations@reliefhotelsandsuites.com
            - generic [ref=e269]:
              - img [ref=e270]
              - paragraph [ref=e273]: Calabar, Cross River, Nigeria
      - generic [ref=e274]:
        - paragraph [ref=e275]: © 2026 Relief Hotels & Suites. All rights reserved.
        - generic [ref=e276]:
          - link "Privacy policy" [ref=e277] [cursor=pointer]:
            - /url: /privacy
          - paragraph [ref=e278]: Luxury stays, bespoke service, and memorable arrivals in Calabar.
  - link "Chat on WhatsApp at +234 810 065 3664" [ref=e279] [cursor=pointer]:
    - /url: https://wa.me/2348100653664?text=Hello%20Relief%20Hotels%20%26%20Suites%20%E2%80%94%20I%E2%80%99d%20like%20help%20with%20a%20stay.
    - img [ref=e280]
    - generic [ref=e282]: Chat on WhatsApp
  - button "Open Next.js Dev Tools" [ref=e288] [cursor=pointer]:
    - img [ref=e289]
  - alert [ref=e292]
```

# Test source

```ts
  163 |       route.fulfill({
  164 |         status: 200,
  165 |         contentType: "application/json",
  166 |         body: JSON.stringify({ error: "blocked in e2e test" }),
  167 |       }),
  168 |     );
  169 | 
  170 |     await page.goto(
  171 |       `/en/book?id=${ROOM_ID}&checkIn=${today}&checkOut=${tomorrow}&guests=1`,
  172 |     );
  173 |     await expect(page.getByRole("heading", { name: /complete your booking/i })).toBeVisible({
  174 |       timeout: 30_000,
  175 |     });
  176 | 
  177 |     await page.getByLabel("First name").fill("Playwright");
  178 |     await page.getByLabel("Last name").fill(lastName);
  179 |     await page.getByLabel("Email for receipt").fill(email);
  180 |     await page.getByLabel(/phone/i).fill("+2348030000099");
  181 |     await page.getByLabel(/agree to the booking terms/i).check();
  182 |     await page.getByRole("button", { name: "Continue to payment" }).click();
  183 | 
  184 |     await expect(page.getByRole("button", { name: /pay deposit/i })).toBeVisible({
  185 |       timeout: 15_000,
  186 |     });
  187 | 
  188 |     const [createRes] = await Promise.all([
  189 |       page.waitForResponse(
  190 |         (r) => r.url().includes("/api/reservations") && r.request().method() === "POST",
  191 |       ),
  192 |       page.getByRole("button", { name: /pay deposit/i }).click(),
  193 |     ]);
  194 |     const created = (await createRes.json()) as { ok?: boolean; id?: string };
  195 |     expect(created.id).toBeTruthy();
  196 |     const reservationId = created.id as string;
  197 | 
  198 |     // --- 3. The room is already gone from availability the moment the
  199 |     //     (still-pending, unpaid) reservation exists — inventory is held on
  200 |     //     request, not on payment. Only a cancelled reservation is excluded
  201 |     //     (src/lib/db/inventory-store.ts#countOccupiedUnits). ---
  202 |     const afterPendingBooking = await getAvailability(page, today, tomorrow);
  203 |     expect(isRoomAvailable(afterPendingBooking, ROOM_ID)).toBeFalsy();
  204 | 
  205 |     // --- 4. Cashier/manager settles the deposit in cash (front-desk payment flow) ---
  206 |     await page.goto(`/en/staff/cashier?${keyQ}`);
  207 |     await expect(page.getByRole("heading", { name: /cashier/i })).toBeVisible({
  208 |       timeout: 30_000,
  209 |     });
  210 |     await page.getByRole("tab", { name: "Settle deposit" }).click();
  211 | 
  212 |     const search = page.getByPlaceholder(/search/i);
  213 |     if (await search.isVisible().catch(() => false)) {
  214 |       await search.fill(email);
  215 |     }
  216 |     await expect(page.getByRole("button", { name: new RegExp(email, "i") })).toBeVisible({
  217 |       timeout: 20_000,
  218 |     });
  219 |     await page.getByRole("button", { name: new RegExp(email, "i") }).click();
  220 | 
  221 |     await expect(page.locator("#cashier-amount")).toBeVisible();
  222 |     // The button's accessible name is "Cash Guest paid in cash" (label + subtitle
  223 |     // in one control), so an exact "Cash" match never resolves — match the prefix.
  224 |     // Clicking it settles immediately; there's no separate confirm button.
  225 |     await page.getByRole("button", { name: /^Cash\b/i }).click();
  226 |     await expect(page.getByText(/Payment settled — reservation confirmed/i)).toBeVisible({
  227 |       timeout: 30_000,
  228 |     });
  229 | 
  230 |     // Confirming payment doesn't change occupancy — it was already held pending.
  231 |     const afterConfirm = await getAvailability(page, today, tomorrow);
  232 |     expect(isRoomAvailable(afterConfirm, ROOM_ID)).toBeFalsy();
  233 | 
  234 |     // --- 5. Front desk checks the guest out from the staff calendar ---
  235 |     await page.goto(`/en/staff/calendar?${keyQ}`);
  236 |     await expect(page.getByRole("heading", { name: /calendar|occupancy/i })).toBeVisible({
  237 |       timeout: 30_000,
  238 |     });
  239 | 
  240 |     // The occupancy table paginates 8 rows at a time across all 31 units;
  241 |     // Presidential Suite (category "penthouse") isn't guaranteed to be on
  242 |     // page 1. Filter to its category chip so its single row is always shown.
  243 |     await page.getByRole("button", { name: "Penthouse", exact: true }).click();
  244 | 
  245 |     const bookingCell = page.getByRole("button", { name: new RegExp(lastName, "i") });
  246 |     await expect(bookingCell).toBeVisible({ timeout: 20_000 });
  247 |     await bookingCell.click();
  248 | 
  249 |     await expect(page.getByRole("dialog")).toBeVisible();
  250 |     page.once("dialog", (d) => d.accept()); // window.confirm("Check out this guest? ...")
  251 |     const [checkoutRes] = await Promise.all([
  252 |       page.waitForResponse(
  253 |         (r) =>
  254 |           r.url().includes(`/api/demo/reservations/${reservationId}`) &&
  255 |           r.request().method() === "PATCH",
  256 |       ),
  257 |       page.getByRole("button", { name: "Check out" }).click(),
  258 |     ]);
  259 |     const checkoutBody = (await checkoutRes.json()) as {
  260 |       reservation: { status: string };
  261 |       housekeeping: { id: string; roomId: string; blockType: string } | null;
  262 |     };
> 263 |     expect(checkoutBody.reservation.status).toBe("checked_out");
      |                                     ^ TypeError: Cannot read properties of undefined (reading 'status')
  264 |     expect(checkoutBody.housekeeping).toBeTruthy();
  265 |     expect(checkoutBody.housekeeping?.roomId).toBe(ROOM_ID);
  266 |     expect(checkoutBody.housekeeping?.blockType).toBe("housekeeping");
  267 |     const housekeepingBlockId = checkoutBody.housekeeping!.id;
  268 | 
  269 |     // Checkout alone does not free the room for its original dates: the
  270 |     // checked_out reservation still overlaps today→tomorrow, and the fresh
  271 |     // housekeeping block does too.
  272 |     const afterCheckout = await getAvailability(page, today, tomorrow);
  273 |     expect(isRoomAvailable(afterCheckout, ROOM_ID)).toBeFalsy();
  274 | 
  275 |     // --- 6. Cleaner clears the room in /staff/housekeeping ---
  276 |     await page.goto(`/en/staff/housekeeping?${keyQ}`);
  277 |     await expect(page.getByRole("heading", { name: /room readiness/i })).toBeVisible({
  278 |       timeout: 30_000,
  279 |     });
  280 | 
  281 |     const housekeepingRow = page
  282 |       .locator("li")
  283 |       .filter({ hasText: ROOM_LABEL })
  284 |       .filter({ hasText: /guest checked out/i });
  285 |     await expect(housekeepingRow).toBeVisible({ timeout: 20_000 });
  286 |     await housekeepingRow.getByRole("button", { name: /mark clean/i }).click();
  287 |     await expect(housekeepingRow).toBeHidden({ timeout: 20_000 });
  288 | 
  289 |     const blockCheck = await page.request.get(`/api/staff/room-blocks?${keyQ}`);
  290 |     const blockBody = (await blockCheck.json()) as { blocks: Array<{ id: string }> };
  291 |     expect(blockBody.blocks.some((b) => b.id === housekeepingBlockId)).toBeFalsy();
  292 | 
  293 |     // --- 7. Even fully cleaned, the room is STILL unavailable for its
  294 |     //     original booked dates — the checked_out reservation record itself
  295 |     //     is the only remaining thing occupying today→tomorrow. This is the
  296 |     //     concrete evidence for the "no guest-departure tracking" finding
  297 |     //     above: nothing frees inventory except the calendar date rolling
  298 |     //     past the stored checkOut. ---
  299 |     const afterMarkClean = await getAvailability(page, today, tomorrow);
  300 |     expect(isRoomAvailable(afterMarkClean, ROOM_ID)).toBeFalsy();
  301 | 
  302 |     // --- 8. Query the day AFTER the booked stay ends: the room is back,
  303 |     //     purely because the date range no longer overlaps checkOut. ---
  304 |     const nextWindow = await getAvailability(page, tomorrow, dayAfter);
  305 |     expect(isRoomAvailable(nextWindow, ROOM_ID)).toBeTruthy();
  306 |   });
  307 | });
  308 | 
```