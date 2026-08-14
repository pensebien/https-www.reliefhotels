import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { promises as fs } from "node:fs";
import path from "node:path";

const TAX_SETTINGS_FILE = path.join(process.cwd(), "data", "tax-settings.json");

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

async function loginAs(name: string, pin: string): Promise<string> {
  const { POST: login } = await import("@/app/api/staff/auth/login/route");
  const res = await login(
    new Request("http://localhost/api/staff/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin }),
    }),
  );
  return extractCookie(res);
}

describe("GET/PATCH /api/staff/settings/tax", () => {
  before(async () => {
    setTestEnv();
    await fs.rm(TAX_SETTINGS_FILE, { force: true });
  });

  it("any authenticated staff role can read tax settings", async () => {
    const cookie = await loginAs("Cleaner Head Demo", "4444");
    const { GET } = await import("@/app/api/staff/settings/tax/route");
    const res = await GET(
      new Request("http://localhost/api/staff/settings/tax", { headers: { cookie } }),
    );
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.settings.vatPercentage, 7.5);
    assert.equal(body.settings.collectionMode, "pass_through");
  });

  it("cashier cannot change tax settings", async () => {
    const cookie = await loginAs("Cashier Demo", "1111");
    const { PATCH } = await import("@/app/api/staff/settings/tax/route");
    const res = await PATCH(
      new Request("http://localhost/api/staff/settings/tax", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ vatPercentage: 10 }),
      }),
    );
    assert.equal(res.status, 403);
  });

  it("manager can change the VAT rate and collection mode", async () => {
    const cookie = await loginAs("Manager Demo", "2222");
    const { PATCH } = await import("@/app/api/staff/settings/tax/route");
    const res = await PATCH(
      new Request("http://localhost/api/staff/settings/tax", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ vatPercentage: 10, collectionMode: "absorbed" }),
      }),
    );
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.settings.vatPercentage, 10);
    assert.equal(body.settings.collectionMode, "absorbed");

    // restore defaults so this test is order-independent / re-runnable
    const { PATCH: restore } = await import("@/app/api/staff/settings/tax/route");
    await restore(
      new Request("http://localhost/api/staff/settings/tax", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ vatPercentage: 7.5, collectionMode: "pass_through" }),
      }),
    );
  });

  it("restaurant_owner can also change tax settings", async () => {
    const cookie = await loginAs("Restaurant Owner Demo", "3333");
    const { PATCH } = await import("@/app/api/staff/settings/tax/route");
    const res = await PATCH(
      new Request("http://localhost/api/staff/settings/tax", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ vatPercentage: 7.5 }),
      }),
    );
    assert.equal(res.status, 200);
  });
});
