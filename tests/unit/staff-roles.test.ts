import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccess,
  getAccessLevel,
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

  it("only managers reach the RAYZA settings page", () => {
    assert.equal(canAccess("manager", "/staff/rayza"), true);
    assert.equal(canAccess("cashier", "/staff/rayza"), false);
    assert.equal(canAccess("restaurant_owner", "/staff/rayza"), false);
  });

  it("every role sees online bookings; F&B and housekeeping roles only read them", () => {
    for (const role of ["cashier", "manager", "restaurant_owner", "cleaner_head"] as const) {
      assert.ok(getAccessibleNavItems(role).some((i) => i.href === "/staff"));
    }
    assert.equal(getAccessLevel("cashier", "/staff"), "full");
    assert.equal(getAccessLevel("cleaner_head", "/staff"), "read");
  });

  it("hotel operations pages are gone from the website", () => {
    for (const href of ["/staff/cashier", "/staff/fnb", "/staff/housekeeping", "/staff/accounting"]) {
      assert.equal(canAccess("manager", href), false);
    }
  });
});
