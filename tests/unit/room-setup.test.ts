import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildInventoryCalendar } from "@/lib/inventory-calendar";
import {
  DEFAULT_ROOM_SETUP,
  normalizeRoomSetup,
  roomSetupSchema,
  unitLabelMap,
} from "@/lib/room-setup";

const guestRoom = (over: Record<string, unknown> = {}) => ({
  roomId: "guest-room",
  inventory: 3,
  bookableOnline: true,
  unitLabels: ["101", "102", "103"],
  photos: [],
  ...over,
});

describe("room setup validation", () => {
  it("requires one unique room number per room, across all room types", () => {
    assert.equal(roomSetupSchema.safeParse({ rooms: [guestRoom()] }).success, true);
    assert.equal(roomSetupSchema.safeParse({ rooms: [guestRoom({ unitLabels: ["101", "102"] })] }).success, false);
    assert.equal(roomSetupSchema.safeParse({ rooms: [guestRoom({ unitLabels: ["101", "101", "103"] })] }).success, false);
    assert.equal(
      roomSetupSchema.safeParse({
        rooms: [guestRoom(), { ...guestRoom(), roomId: "executive-room", unitLabels: ["201", "202", "103"] }],
      }).success,
      false,
    );
  });

  it("accepts uploaded paths and https photos only", () => {
    assert.equal(roomSetupSchema.safeParse({ rooms: [guestRoom({ photos: ["/uploads/rooms/a.jpg", "https://x.supabase.co/a.png"] })] }).success, true);
    assert.equal(roomSetupSchema.safeParse({ rooms: [guestRoom({ photos: ["javascript:alert(1)"] })] }).success, false);
  });

  it("fills defaults for missing room types and pads room numbers to the inventory", () => {
    const setup = normalizeRoomSetup({ rooms: [{ ...guestRoom(), inventory: 5 }] });
    assert.equal(setup.rooms.length, DEFAULT_ROOM_SETUP.rooms.length);
    assert.deepEqual(setup.rooms[0].unitLabels, ["101", "102", "103", "104", "105"]);
    assert.equal(roomSetupSchema.safeParse(DEFAULT_ROOM_SETUP).success, true, "defaults must be valid");
    assert.deepEqual(DEFAULT_ROOM_SETUP.rooms[1].unitLabels.slice(0, 2), ["201", "202"]);
    assert.deepEqual(normalizeRoomSetup(null), DEFAULT_ROOM_SETUP);
    assert.equal(unitLabelMap(setup)["guest-room-2"], "102");
  });
});

describe("calendar with room setup", () => {
  const base = {
    firstName: "Ada", lastName: "Obi", email: "a@b.c", guests: 2, roomId: "guest-room",
    stayPreference: "guest-room", status: "confirmed" as const, source: "live", createdAt: "2026-10-01T00:00:00Z",
    checkIn: "2026-10-05", checkOut: "2026-10-07",
  };

  it("labels rows with room numbers and spreads a 2-room booking over 2 rows", () => {
    const { rows, bookings } = buildInventoryCalendar({
      reservations: [{ ...base, id: "r1", units: 2 }],
      eventInquiries: [],
      weekAnchor: new Date(2026, 9, 5),
      unitLabels: { "rooms.guest.name": "Standard" },
      unitSetup: { "guest-room": { inventory: 3, unitLabels: ["101", "102", "103"] } },
    });
    const guestRows = rows.filter((r) => r.unit.roomId === "guest-room");
    assert.deepEqual(guestRows.map((r) => r.unitLabel), ["Standard · 101", "Standard · 102", "Standard · 103"]);
    assert.equal(bookings.filter((b) => b.id === "r1").length, 2);
    assert.deepEqual(bookings.filter((b) => b.id === "r1").map((b) => b.unitId).sort(), ["guest-room-1", "guest-room-2"]);
  });

  it("puts staff-assigned rooms exactly where assigned, others in the first free room", () => {
    const { bookings } = buildInventoryCalendar({
      reservations: [
        { ...base, id: "free" },
        { ...base, id: "pinned", assignedUnits: ["guest-room-1"] },
      ],
      eventInquiries: [],
      weekAnchor: new Date(2026, 9, 5),
      unitLabels: {},
      unitSetup: { "guest-room": { inventory: 3, unitLabels: ["101", "102", "103"] } },
    });
    assert.equal(bookings.find((b) => b.id === "pinned")?.unitId, "guest-room-1");
    assert.equal(bookings.find((b) => b.id === "free")?.unitId, "guest-room-2");
  });
});
