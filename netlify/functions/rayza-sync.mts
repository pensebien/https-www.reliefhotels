/**
 * Netlify scheduled function: every 15 minutes push confirmed bookings RAYZA
 * HMS hasn't accepted yet and release cancelled ones (retries failures).
 * Needs CRON_SECRET (same as daily-jobs).
 */
export default async function rayzaSync(): Promise<Response> {
  const base = (process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/cron/rayza`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
  });
  const body = await res.text();
  console.log("[rayza-sync]", res.status, body.slice(0, 500));
  return new Response(body, { status: res.status });
}

export const config = { schedule: "*/15 * * * *" };
