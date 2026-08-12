import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignBookingsToUnits,
  buildInventoryCalendar,
  buildWeekDays,
  reservationToBookings,
  roomBlockToBookings,
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

  it("maps a room block to a blocked calendar booking", () => {
    const [booking] = roomBlockToBookings({
      id: "block-1",
      roomId: "guest-room",
      checkIn: "2026-07-01",
      checkOut: "2026-07-03",
      reason: "HVAC maintenance",
      blockType: "maintenance",
      createdAt: "2026-06-30T00:00:00Z",
    });
    assert.equal(booking?.kind, "block");
    assert.equal(booking?.status, "blocked");
    assert.equal(booking?.label, "HVAC maintenance");
  });

  it("surfaces a room block as a blocked cell on the calendar grid", () => {
    const { rows } = buildInventoryCalendar({
      reservations: [],
      eventInquiries: [],
      roomBlocks: [
        {
          id: "block-1",
          roomId: "guest-room",
          checkIn: "2026-07-01",
          checkOut: "2026-07-03",
          reason: "HVAC maintenance",
          blockType: "maintenance",
          createdAt: "2026-06-30T00:00:00Z",
        },
      ],
      weekAnchor: new Date(2026, 6, 1),
      unitLabels: {},
    });

    const guestRoomRow = rows.find((r) => r.unit.roomId === "guest-room");
    const blockedCell = guestRoomRow?.cells.find((c) => c.ymd === "2026-07-01");
    assert.equal(blockedCell?.status, "blocked");
    assert.equal(blockedCell?.booking?.label, "HVAC maintenance");
  });

  it("does not double-count a blocked unit as free", () => {
    const { rows } = buildInventoryCalendar({
      reservations: [],
      eventInquiries: [],
      roomBlocks: [
        {
          id: "block-1",
          roomId: "presidential-suite",
          checkIn: "2026-07-01",
          checkOut: "2026-07-03",
          blockType: "housekeeping",
          createdAt: "2026-06-30T00:00:00Z",
        },
      ],
      weekAnchor: new Date(2026, 6, 1),
      unitLabels: {},
    });

    // presidential-suite has exactly 1 unit — it must show blocked, not free.
    const suiteRow = rows.find((r) => r.unit.roomId === "presidential-suite");
    const cell = suiteRow?.cells.find((c) => c.ymd === "2026-07-01");
    assert.equal(cell?.status, "blocked");
  });
});
