/**
 * iCal (RFC 5545) calendar sync — the no-contract way to keep Booking.com,
 * Airbnb, Expedia and Google in step until a channel manager is connected.
 * Pure helpers: parse an OTA feed, and build our "not available" feed.
 */

export type IcalEvent = { uid: string; checkIn: string; checkOut: string; summary: string };

/** RFC 5545 line unfolding: a line starting with space/tab continues the previous one. */
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

/** "20261010", "20261010T140000Z" or "20261010T140000" → "2026-10-10". */
function toYmd(value: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function nextDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function unescapeText(value: string): string {
  return value.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

/** Events that still matter (ending after `today`), in date form. Malformed events are skipped. */
export function parseIcal(text: string, today: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  let current: Record<string, string> | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) {
        const checkIn = current.DTSTART ? toYmd(current.DTSTART) : null;
        let checkOut = current.DTEND ? toYmd(current.DTEND) : null;
        if (checkIn && (!checkOut || checkOut <= checkIn)) checkOut = nextDay(checkIn);
        if (checkIn && checkOut && checkOut > today) {
          events.push({
            uid: current.UID ?? `${checkIn}-${checkOut}`,
            checkIn,
            checkOut,
            summary: unescapeText(current.SUMMARY ?? "Booked on another channel"),
          });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).split(";")[0].toUpperCase();
    current[name] = line.slice(colon + 1);
  }
  return events;
}

/** Merge consecutive unavailable days into [start, end) ranges. */
export function mergeDays(days: string[]): { start: string; end: string }[] {
  const sorted = [...new Set(days)].sort();
  const ranges: { start: string; end: string }[] = [];
  for (const day of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && last.end === day) last.end = nextDay(day);
    else ranges.push({ start: day, end: nextDay(day) });
  }
  return ranges;
}

const compact = (ymd: string) => ymd.replace(/-/g, "");

/** Our export feed: one all-day "Not available" event per run of fully booked days. */
export function buildIcalFeed(input: {
  calendarName: string;
  roomId: string;
  unavailableDays: string[];
  now?: Date;
}): string {
  const stamp = (input.now ?? new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Relief Hotels & Suites//Booking engine//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${input.calendarName.replace(/[,;]/g, " ")}`,
  ];
  for (const range of mergeDays(input.unavailableDays)) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${input.roomId}-${compact(range.start)}@reliefhotelsandsuites.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(range.start)}`,
      `DTEND;VALUE=DATE:${compact(range.end)}`,
      "SUMMARY:Not available",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/**
 * Feed URLs come from staff and are fetched by the server, so refuse
 * anything that could reach internal services: https only, no private,
 * loopback or link-local hosts.
 */
export function isSafeFeedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (/^\[?[0-9a-f:]+\]?$/.test(host) && host.includes(":")) return false; // raw IPv6
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224) {
      return false;
    }
  }
  return true;
}
