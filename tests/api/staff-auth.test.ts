import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.STAFF_AUTH_ENABLED = "true";
  process.env.STAFF_SESSION_SECRET = "test-secret-value";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function extractCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? "";
  const [pair] = setCookie.split(";");
  return pair;
}

describe("staff auth (login/logout/me + role enforcement)", () => {
  before(() => {
    setTestEnv();
  });

  it("GET /api/staff/auth/me reports disabled when the flag is off", async () => {
    process.env.STAFF_AUTH_ENABLED = "false";
    const { GET } = await import("@/app/api/staff/auth/me/route");
    const res = await GET(new Request("http://localhost/api/staff/auth/me"));
    const body = await res.json();
    assert.equal(body.enabled, false);
    process.env.STAFF_AUTH_ENABLED = "true";
  });

  it("rejects login with the wrong PIN", async () => {
    const { POST } = await import("@/app/api/staff/auth/login/route");
    const res = await POST(
      new Request("http://localhost/api/staff/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Manager Demo", pin: "0000" }),
      }),
    );
    assert.equal(res.status, 401);
  });

  it("logs in the seeded manager demo account and sets a session cookie", async () => {
    const { POST } = await import("@/app/api/staff/auth/login/route");
    const res = await POST(
      new Request("http://localhost/api/staff/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Manager Demo", pin: "2222" }),
      }),
    );
    assert.equal(res.status, 200);
    const cookie = extractCookie(res);
    assert.ok(cookie.startsWith("relief_staff_session="));

    const { GET: meRoute } = await import("@/app/api/staff/auth/me/route");
    const meRes = await meRoute(
      new Request("http://localhost/api/staff/auth/me", {
        headers: { cookie },
      }),
    );
    const me = await meRes.json();
    assert.equal(me.authenticated, true);
    assert.equal(me.role, "manager");
  });

  it("a cashier session cannot reach a cleaner_head/manager-only route", async () => {
    const { POST: login } = await import("@/app/api/staff/auth/login/route");
    const loginRes = await login(
      new Request("http://localhost/api/staff/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Cashier Demo", pin: "1111" }),
      }),
    );
    const cookie = extractCookie(loginRes);

    const { GET: roomBlocks } = await import("@/app/api/staff/room-blocks/route");
    const res = await roomBlocks(
      new Request("http://localhost/api/staff/room-blocks", {
        headers: { cookie },
      }),
    );
    assert.equal(res.status, 403);
  });

  it("a manager session can reach the room-blocks route", async () => {
    const { POST: login } = await import("@/app/api/staff/auth/login/route");
    const loginRes = await login(
      new Request("http://localhost/api/staff/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Manager Demo", pin: "2222" }),
      }),
    );
    const cookie = extractCookie(loginRes);

    const { GET: roomBlocks } = await import("@/app/api/staff/room-blocks/route");
    const res = await roomBlocks(
      new Request("http://localhost/api/staff/room-blocks", {
        headers: { cookie },
      }),
    );
    assert.equal(res.status, 200);
  });

  it("logout tells the browser to drop the session cookie", async () => {
    const { POST: logout } = await import("@/app/api/staff/auth/logout/route");
    const logoutRes = await logout();
    const setCookie = logoutRes.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /relief_staff_session=;/);
    assert.match(setCookie, /Expires=Thu, 01 Jan 1970/i);
  });
});
