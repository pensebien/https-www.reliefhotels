import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

const KEY = "relief-demo-2026";

describe("Reports API", () => {
  before(() => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    delete process.env.DEMO_DASHBOARD_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("validates the range, returns JSON and downloads CSV", async () => {
    const { GET } = await import("@/app/api/staff/reports/route");
    const url = (qs: string) => new Request(`http://localhost/api/staff/reports?key=${KEY}&${qs}`);
    assert.equal((await GET(new Request("http://localhost/api/staff/reports?from=2026-10-01&to=2026-10-02"))).status, 401);
    assert.equal((await GET(url("from=2026-10-05&to=2026-10-01"))).status, 400);
    assert.equal((await GET(url("from=2024-01-01&to=2026-01-01"))).status, 400, "more than a year");

    const res = await GET(url("from=2026-10-01&to=2026-10-31"));
    const body = (await res.json()) as { report: { days: number; daily: unknown[]; occupancy: { roomNightsAvailable: number } } };
    assert.equal(res.status, 200);
    assert.equal(body.report.days, 31);
    assert.equal(body.report.daily.length, 31);
    assert.ok(body.report.occupancy.roomNightsAvailable > 0);

    const csv = await GET(url("from=2026-10-01&to=2026-10-03&format=csv"));
    assert.equal(csv.headers.get("content-type"), "text/csv; charset=utf-8");
    assert.match(csv.headers.get("content-disposition") ?? "", /relief-report-2026-10-01-to-2026-10-03\.csv/);
    assert.match(await csv.text(), /Date,Occupied rooms/);
  });
});
