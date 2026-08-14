import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccess,
  getAccessibleNavItems,
  isStaffRole,
  parseStaffRole,
} from "@/lib/staff-roles";

describe("staff-roles access matrix", () => {
  it("recognizes exactly the four real roles", () => {
    assert.equal(isStaffRole("cashier"), true);
    assert.equal(isStaffRole("manager"), true);
    assert.equal(isStaffRole("restaurant_owner"), true);
    assert.equal(isStaffRole("cleaner_head"), true);
    assert.equal(isStaffRole("front_desk"), false);
    assert.equal(isStaffRole("accountant"), false);
  });

  it("falls back to the default role for unknown values", () => {
    assert.equal(parseStaffRole("not-a-role"), "cashier");
    assert.equal(parseStaffRole(null), "cashier");
  });

  it("gates accounting and tax settings away from cashier/cleaner_head", () => {
    assert.equal(canAccess("cashier", "/staff/accounting"), false);
    assert.equal(canAccess("cleaner_head", "/staff/accounting"), false);
    assert.equal(canAccess("manager", "/staff/accounting"), true);
  });

  it("gives cleaner_head full housekeeping access and read-only calendar", () => {
    const items = getAccessibleNavItems("cleaner_head");
    const hrefs = items.map((i) => i.href);
    assert.ok(hrefs.includes("/staff/housekeeping"));
    assert.ok(hrefs.includes("/staff/calendar"));
    assert.ok(!hrefs.includes("/staff/accounting"));
  });

  it("restaurant_owner cannot reach cashier or room-block routes", () => {
    assert.equal(canAccess("restaurant_owner", "/staff/cashier"), false);
    assert.equal(canAccess("restaurant_owner", "/staff/fnb"), true);
    assert.equal(canAccess("restaurant_owner", "/staff/settings/tax"), true);
  });
});
