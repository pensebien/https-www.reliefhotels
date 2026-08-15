import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_APP_URL = "https://www.reliefhotelsandsuites.com";
process.env.STAFF_PORTAL_HOST = "reservation.reliefhotelsandsuites.com";

const { canonicalHostRedirectTarget } = await import("@/lib/public-site");

describe("canonicalHostRedirectTarget", () => {
  it("redirects apex guest host to www", () => {
    assert.equal(
      canonicalHostRedirectTarget("reliefhotelsandsuites.com"),
      "www.reliefhotelsandsuites.com",
    );
  });

  it("leaves www alone", () => {
    assert.equal(canonicalHostRedirectTarget("www.reliefhotelsandsuites.com"), null);
  });

  it("skips staff portal host", () => {
    assert.equal(
      canonicalHostRedirectTarget("reservation.reliefhotelsandsuites.com"),
      null,
    );
  });

  it("skips localhost and Netlify previews", () => {
    assert.equal(canonicalHostRedirectTarget("localhost:3002"), null);
    assert.equal(canonicalHostRedirectTarget("foo.netlify.app"), null);
  });
});
