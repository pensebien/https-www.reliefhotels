import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.STAFF_AUTH_ENABLED = "true";
  process.env.STAFF_SESSION_SECRET = "test-secret-value";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3002";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.PAYSTACK_PUBLIC_KEY;
  delete process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
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

describe("GET /api/staff/accounting/reconcile", () => {
  before(() => {
    setTestEnv();
  });

  it("rejects a cashier session (manager only)", async () => {
    const cookie = await loginAs("Cashier Demo", "1111");
    const { GET } = await import("@/app/api/staff/accounting/reconcile/route");
    const res = await GET(
      new Request(
        "http://localhost/api/staff/accounting/reconcile?from=2026-08-01&to=2026-08-13",
        { headers: { cookie } },
      ),
    );
    assert.equal(res.status, 403);
  });

  it("rejects a manager request with missing dates", async () => {
    const cookie = await loginAs("Manager Demo", "2222");
    const { GET } = await import("@/app/api/staff/accounting/reconcile/route");
    const res = await GET(
      new Request("http://localhost/api/staff/accounting/reconcile", {
        headers: { cookie },
      }),
    );
    assert.equal(res.status, 400);
  });

  it("rejects an inverted date range", async () => {
    const cookie = await loginAs("Manager Demo", "2222");
    const { GET } = await import("@/app/api/staff/accounting/reconcile/route");
    const res = await GET(
      new Request(
        "http://localhost/api/staff/accounting/reconcile?from=2026-08-13&to=2026-08-01",
        { headers: { cookie } },
      ),
    );
    assert.equal(res.status, 400);
  });

  it("returns a demo-mode result (no discrepancies attempted) without live Paystack keys", async () => {
    const cookie = await loginAs("Manager Demo", "2222");
    const { GET } = await import("@/app/api/staff/accounting/reconcile/route");
    const res = await GET(
      new Request(
        "http://localhost/api/staff/accounting/reconcile?from=2026-08-01&to=2026-08-13",
        { headers: { cookie } },
      ),
    );
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.demo, true);
    assert.deepEqual(body.discrepancies, []);
  });
});
