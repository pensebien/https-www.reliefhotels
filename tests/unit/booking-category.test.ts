import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveBookingCategoryKey } from "@/lib/booking-category";

describe("resolveBookingCategoryKey", () => {
  it("maps room catalog ids to category labels", () => {
    assert.equal(
      resolveBookingCategoryKey({ itemType: "room", itemId: "executive-room" }),
      "executive",
    );
    assert.equal(
      resolveBookingCategoryKey({ itemType: "room", roomId: "signature-suite" }),
      "suite",
    );
    assert.equal(
      resolveBookingCategoryKey({
        itemType: "room",
        stayPreference: "presidential-suite · 2 night(s)",
      }),
      "penthouse",
    );
  });

  it("maps tours separately from rooms", () => {
    assert.equal(
      resolveBookingCategoryKey({ itemType: "tour", itemId: "calabar-heritage" }),
      "tour",
    );
  });
});
