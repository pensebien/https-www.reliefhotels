/**
 * Calendar feeds staff connect per room type (Airbnb, Booking.com, …), and
 * the sync that turns each feed's bookings into room blocks.
 */

import { rooms } from "@/content/site";
import { replaceChannelBlocks } from "@/lib/db/inventory-store";
import { lagosToday } from "@/lib/guest-messages/render";
import { readSettingsDoc, writeSettingsDoc } from "@/lib/settings-store";
import { z } from "zod";
import { isSafeFeedUrl, parseIcal } from "./ical";

export const channelFeedSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  label: z.string().trim().min(1).max(60),
  roomId: z.string().refine((id) => rooms.some((r) => r.id === id), { message: "Unknown room type" }),
  url: z.string().trim().max(1000).refine(isSafeFeedUrl, { message: "Use the https calendar link from the booking site" }),
  active: z.boolean(),
});

export const channelFeedsSchema = z.object({ feeds: z.array(channelFeedSchema).max(30) });
export type ChannelFeed = z.infer<typeof channelFeedSchema>;

export type FeedStatus = { at: string; ok: boolean; events?: number; error?: string };

const FEEDS_KEY = "channel_feeds";
const STATUS_KEY = "channel_feed_status";

export async function getChannelFeeds(): Promise<ChannelFeed[]> {
  const doc = await readSettingsDoc(FEEDS_KEY, (raw) => {
    const parsed = channelFeedsSchema.safeParse(raw);
    return parsed.success ? parsed.data : { feeds: [] };
  });
  return doc.feeds;
}

export async function getFeedStatus(): Promise<Record<string, FeedStatus>> {
  return readSettingsDoc(STATUS_KEY, (raw) => (raw && typeof raw === "object" ? (raw as Record<string, FeedStatus>) : {}));
}

export const sourceFor = (feedId: string) => `ical:${feedId}`;

/** Saves feeds; blocks from removed feeds are cleared straight away. */
export async function saveChannelFeeds(input: unknown): Promise<ChannelFeed[]> {
  const parsed = channelFeedsSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const ids = parsed.data.feeds.map((f) => f.id);
  if (new Set(ids).size !== ids.length) throw new Error("Each feed needs its own id");
  const before = await getChannelFeeds();
  for (const old of before) {
    if (!ids.includes(old.id)) await replaceChannelBlocks(sourceFor(old.id), old.roomId, []);
  }
  return (await writeSettingsDoc(FEEDS_KEY, parsed.data)).feeds;
}

const MAX_BYTES = 1024 * 1024;

async function fetchFeed(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    redirect: "error",
    headers: { Accept: "text/calendar, text/plain;q=0.8" },
  });
  if (!res.ok) throw new Error(`The booking site answered ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error("Calendar is larger than 1 MB");
  if (!text.includes("BEGIN:VCALENDAR")) throw new Error("That link isn't a calendar (.ics) feed");
  return text;
}

/** Pull every active feed; one feed failing never stops the others. */
export async function syncChannelFeeds(
  fetcher: (url: string) => Promise<string> = fetchFeed,
): Promise<Record<string, FeedStatus>> {
  const feeds = await getChannelFeeds();
  const status = { ...(await getFeedStatus()) };
  const today = lagosToday();
  for (const feed of feeds) {
    const at = new Date().toISOString();
    if (!feed.active) {
      await replaceChannelBlocks(sourceFor(feed.id), feed.roomId, []);
      status[feed.id] = { at, ok: true, events: 0 };
      continue;
    }
    try {
      const events = parseIcal(await fetcher(feed.url), today).map((e) => ({
        ...e,
        summary: `${feed.label}: ${e.summary}`,
      }));
      await replaceChannelBlocks(sourceFor(feed.id), feed.roomId, events);
      status[feed.id] = { at, ok: true, events: events.length };
    } catch (error) {
      // Keep the last good blocks; report the problem.
      status[feed.id] = { at, ok: false, error: error instanceof Error ? error.message : "Sync failed" };
    }
  }
  await writeSettingsDoc(STATUS_KEY, status);
  return status;
}
