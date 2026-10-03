import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildIcalFeed, isSafeFeedUrl, mergeDays, parseIcal } from "@/lib/channels/ical";

const AIRBNB = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261012",
  "DTEND;VALUE=DATE:20261015",
  "UID:abc-123@airbnb.com",
  "SUMMARY:Reserved",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20261020T140000Z",
  "UID:timed@booking.com",
  "SUMMARY:CLOSED - Not avail",
  " able",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260901",
  "DTEND;VALUE=DATE:20260903",
  "UID:past",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("iCal sync", () => {
  it("parses all-day and timed events, unfolds lines, skips the past", () => {
    assert.deepEqual(parseIcal(AIRBNB, "2026-10-01"), [
      { uid: "abc-123@airbnb.com", checkIn: "2026-10-12", checkOut: "2026-10-15", summary: "Reserved" },
      { uid: "timed@booking.com", checkIn: "2026-10-20", checkOut: "2026-10-21", summary: "CLOSED - Not available" },
    ]);
  });

  it("merges consecutive days and builds a valid feed", () => {
    assert.deepEqual(mergeDays(["2026-10-12", "2026-10-13", "2026-10-15"]), [
      { start: "2026-10-12", end: "2026-10-14" },
      { start: "2026-10-15", end: "2026-10-16" },
    ]);
    const feed = buildIcalFeed({ calendarName: "Relief — Suite", roomId: "signature-suite", unavailableDays: ["2026-10-12", "2026-10-13"], now: new Date("2026-10-01T00:00:00Z") });
    assert.match(feed, /^BEGIN:VCALENDAR\r\n/);
    assert.match(feed, /DTSTART;VALUE=DATE:20261012\r\nDTEND;VALUE=DATE:20261014\r\n/);
    assert.equal(parseIcal(feed, "2026-10-01").length, 1, "our feed parses back");
  });

  it("only fetches public https calendar links", () => {
    assert.equal(isSafeFeedUrl("https://www.airbnb.com/calendar/ical/123.ics?s=abc"), true);
    for (const bad of ["http://www.airbnb.com/x.ics", "https://localhost/x", "https://127.0.0.1/x", "https://10.0.0.5/x", "https://192.168.1.2/x", "https://169.254.169.254/latest", "https://[::1]/x", "https://user:pw@example.com/x", "file:///etc/passwd"]) {
      assert.equal(isSafeFeedUrl(bad), false, bad);
    }
  });
});
