import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterStaffReservationsByQuery,
  paginateStaffReservations,
  STAFF_RESERVATION_PAGE_SIZE,
} from "@/lib/staff-reservation-filter";

const guests = [
  {
    id: "r1",
    firstName: "Ada",
    lastName: "Okonkwo",
    email: "ada@example.com",
    phone: "+234801",
    status: "confirmed",
    stayPreference: "Signature Suite",
  },
  {
    id: "r2",
    firstName: "Chidi",
    lastName: "Bello",
    email: "chidi@example.com",
    status: "pending",
  },
];

describe("staff-reservation-filter", () => {
  it("filters by guest name", () => {
    const result = filterStaffReservationsByQuery(guests, "ada");
    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, "r1");
  });

  it("returns all when query empty", () => {
    assert.equal(filterStaffReservationsByQuery(guests, "  ").length, 2);
  });

  it("paginates results", () => {
    const many = Array.from({ length: STAFF_RESERVATION_PAGE_SIZE + 3 }, (_, i) => ({
      ...guests[0]!,
      id: `r-${i}`,
      email: `g${i}@example.com`,
    }));
    const page1 = paginateStaffReservations(many, 1);
    assert.equal(page1.items.length, STAFF_RESERVATION_PAGE_SIZE);
    assert.equal(page1.totalPages, 2);
    const page2 = paginateStaffReservations(many, 2);
    assert.equal(page2.items.length, 3);
  });
});
