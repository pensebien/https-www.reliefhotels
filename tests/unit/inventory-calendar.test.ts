import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignBookingsToUnits,
  buildWeekDays,
  reservationToBookings,
  startOfWeek,
} from "@/lib/inventory-calendar";
import { buildInventoryUnits } from "@/lib/inventory-units";

describe("inventory calendar", () => {
  it("builds seven day week starting Monday", () => {
    const days = buildWeekDays(new Date(2026, 5, 19));
    assert.equal(days.length, 7);
    assert.equal(days[0]?.ymd, "2026-06-15");
    assert.equal(days[6]?.ymd, "2026-06-21");
  });

  it("maps reservation to stay booking", () => {
    const bookings = reservationToBookings({
      id: "r1",
      firstName: "Ada",
      lastName: "Okonkwo",
      email: "ada@example.com",
      checkIn: "2026-07-01",
      checkOut: "2026-07-03",
      guests: 2,
      stayPreference: "executive-room",
      roomId: "executive-room",
      status: "confirmed",
      source: "live",
      createdAt: "2026-06-01T10:00:00Z",
    });
    assert.equal(bookings.length, 1);
    assert.equal(bookings[0]?.roomId, "executive-room");
  });

  it("assigns non-overlapping stays to different units", () => {
    const units = buildInventoryUnits().filter((u) => u.roomId === "guest-room");
    const assigned = assignBookingsToUnits(
      [
        {
          id: "a",
          kind: "stay",
          roomId: "guest-room",
          guestName: "Guest A",
          email: "a@example.com",
          checkIn: "2026-07-01",
          checkOut: "2026-07-03",
          status: "confirmed",
          guests: 1,
          label: "guest-room",
          source: "live",
          createdAt: "",
          raw: {} as never,
        },
        {
          id: "b",
          kind: "stay",
          roomId: "guest-room",
          guestName: "Guest B",
          email: "b@example.com",
          checkIn: "2026-07-01",
          checkOut: "2026-07-03",
          status: "confirmed",
          guests: 1,
          label: "guest-room",
          source: "live",
          createdAt: "",
          raw: {} as never,
        },
      ],
      units,
    );
    assert.notEqual(assigned[0]?.unitId, assigned[1]?.unitId);
  });

  it("startOfWeek returns Monday for mid-week date", () => {
    const monday = startOfWeek(new Date(2026, 5, 18));
    assert.equal(monday.getDay(), 1);
  });
});
