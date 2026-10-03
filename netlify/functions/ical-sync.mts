/**
 * Netlify scheduled function: every 30 minutes pull the OTA calendar feeds
 * (Airbnb, Booking.com…) into room blocks so channel bookings can't be
 * double-booked here. Needs CRON_SECRET (same as daily-jobs).
 */
export default async function icalSync(): Promise<Response> {
  const base = (process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/cron/ical`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
  });
  const body = await res.text();
  console.log("[ical-sync]", res.status, body.slice(0, 500));
  return new Response(body, { status: res.status });
}

export const config = { schedule: "*/30 * * * *" };
