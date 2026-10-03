/**
 * Netlify scheduled function: once a day at 07:00 UTC (08:00 in Calabar)
 * it calls the app's daily jobs — scheduled guest messages and check-in data
 * clean-up. Needs CRON_SECRET set in Netlify (same value the app reads).
 */
export default async function dailyJobs(): Promise<Response> {
  const base = (process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/cron/daily`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
  });
  const body = await res.text();
  console.log("[daily-jobs]", res.status, body.slice(0, 500));
  return new Response(body, { status: res.status });
}

export const config = { schedule: "0 7 * * *" };
