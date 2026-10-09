/**
 * Netlify scheduled function: every 10 minutes retry guest emails and manager
 * alerts that failed to send (notification outbox). Needs CRON_SECRET.
 */
export default async function outboxRetry(): Promise<Response> {
  const base = (process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/cron/outbox`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
  });
  const body = await res.text();
  console.log("[outbox-retry]", res.status, body.slice(0, 500));
  return new Response(body, { status: res.status });
}

export const config = { schedule: "*/10 * * * *" };
