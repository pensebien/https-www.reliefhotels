import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReservationRecord } from "@/lib/demo-store";
import { dueReservations, lagosToday, renderTemplate, targetBaseDate } from "@/lib/guest-messages/render";
import { DEFAULT_GUEST_MESSAGES, guestMessagesSchema } from "@/lib/guest-messages/settings";

const [preArrival, afterStay] = DEFAULT_GUEST_MESSAGES.templates;

function res(over: Partial<ReservationRecord>): ReservationRecord {
  return {
    id: Math.random().toString(36).slice(2), firstName: "Ada", lastName: "O", email: "ada@example.com", phone: "+234800",
    itemType: "room", roomId: "guest-room", checkIn: "2026-10-12", checkOut: "2026-10-14", guests: 2,
    stayPreference: "x", message: "x", status: "confirmed", source: "live", createdAt: "2026-10-01T09:00:00Z",
    emailSent: true, ...over,
  };
}

describe("guest messages", () => {
  it("ships switched off and valid", () => {
    assert.equal(guestMessagesSchema.safeParse(DEFAULT_GUEST_MESSAGES).success, true);
    assert.ok(DEFAULT_GUEST_MESSAGES.templates.every((t) => !t.active));
  });

  it("finds confirmed bookings on the template's day, once per group", () => {
    assert.equal(targetBaseDate(preArrival, "2026-10-10"), "2026-10-12");
    const due = dueReservations(
      preArrival,
      [
        res({ id: "a" }),
        res({ id: "b", status: "pending" }),
        res({ id: "c", checkIn: "2026-10-13" }),
        res({ id: "lead", groupId: "lead" }),
        res({ id: "member", groupId: "lead" }),
        res({ id: "noemail", email: "" }),
      ],
      "2026-10-10",
    );
    assert.deepEqual(due.map((r) => r.id), ["a", "lead"]);
  });

  it("after-stay messages also reach checked-out guests", () => {
    const due = dueReservations(afterStay, [res({ id: "x", status: "checked_out" })], "2026-10-15");
    assert.deepEqual(due.map((r) => r.id), ["x"]);
  });

  it("fills known placeholders and leaves typos visible", () => {
    const values = {
      firstName: "Ada", lastName: "O", checkIn: "2026-10-12", checkOut: "2026-10-14", nights: "2", roomType: "Standard",
      roomNumbers: "101", manageLink: "L", reviewLink: "R", hotelName: "Relief", hotelPhone: "P",
    };
    assert.equal(renderTemplate("Hi {firstName}, room {roomNumbers} {frstName}", values), "Hi Ada, room 101 {frstName}");
  });

  it("uses Calabar's date (UTC+1)", () => {
    assert.equal(lagosToday(Date.parse("2026-10-10T23:30:00Z")), "2026-10-11");
  });
});
