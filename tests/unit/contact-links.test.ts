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
    assert.equal(phoneDigits("+234 912 478 4058"), "2349124784058");
    assert.equal(toWhatsAppHref("+2349124784058"), "https://wa.me/2349124784058");
    assert.equal(toTelHref("+2349124784058"), "tel:+2349124784058");
  });
});
