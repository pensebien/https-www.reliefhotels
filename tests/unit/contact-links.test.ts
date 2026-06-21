import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  phoneDigits,
  toMailtoHref,
  toTelHref,
  toWhatsAppHref,
} from "@/lib/contact-links";

describe("contact-links", () => {
  it("builds mailto and WhatsApp hrefs", () => {
    assert.equal(toMailtoHref(" guest@example.com "), "mailto:guest@example.com");
    assert.equal(phoneDigits("+234 803 326 2719"), "2348033262719");
    assert.equal(toWhatsAppHref("+2348033262719"), "https://wa.me/2348033262719");
    assert.equal(toTelHref("+2348033262719"), "tel:+2348033262719");
  });
});
