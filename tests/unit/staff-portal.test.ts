import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStaffPortalHost,
  isStaffPortalPath,
  normalizeHost,
} from "@/lib/staff-portal";

describe("staff portal routing helpers", () => {
  it("detects configured staff portal host", () => {
    process.env.STAFF_PORTAL_HOST = "reservation.reliefhotelsandsuites.com.ng";
    assert.equal(
      isStaffPortalHost("reservation.reliefhotelsandsuites.com.ng"),
      true,
    );
    assert.equal(isStaffPortalHost("www.reliefhotelsandsuites.com.ng"), false);
  });

  it("normalizes host with port", () => {
    assert.equal(normalizeHost("reservation.localhost:3002"), "reservation.localhost");
  });

  it("matches staff portal paths", () => {
    assert.equal(isStaffPortalPath("/en/staff"), true);
    assert.equal(isStaffPortalPath("/fr/staff"), true);
    assert.equal(isStaffPortalPath("/en/demo"), false);
  });
});
