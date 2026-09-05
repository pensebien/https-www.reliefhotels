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
    assert.equal(phoneDigits("+234 810 065 3664"), "2348100653664");
    assert.equal(toWhatsAppHref("+2348100653664"), "https://wa.me/2348100653664");
    assert.equal(toTelHref("+2348100653664"), "tel:+2348100653664");
  });
});
