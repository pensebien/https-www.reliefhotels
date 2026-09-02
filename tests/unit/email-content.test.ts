import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  escapeHtml,
  feedbackHtml,
  formatNairaFromKobo,
  paymentConfirmationHtml,
  reservationHtml,
} from "@/lib/email";
import type { ReservationRecord } from "@/lib/demo-store";
import type { GuestFeedback } from "@/lib/inquiry-store";

function baseReservation(overrides: Partial<ReservationRecord> = {}): ReservationRecord {
  return {
    id: "res-1",
    firstName: "Ada",
    lastName: "Okonkwo",
    email: "ada@example.com",
    itemType: "room",
    guests: 2,
    stayPreference: "room:guest-room · 2026-09-01 → 2026-09-03 · 2 night(s) · 2 guest(s)",
    message: "No special requests",
    status: "pending",
    source: "live",
    createdAt: "2026-09-01T00:00:00.000Z",
    emailSent: false,
    ...overrides,
  };
}

function baseFeedback(overrides: Partial<GuestFeedback> = {}): GuestFeedback {
  return {
    id: "fb-1",
    firstName: "Chidi",
    lastName: "Eze",
    email: "chidi@example.com",
    message: "Loved the stay",
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    assert.equal(
      escapeHtml(`<script>alert('x')</script> & "quotes"`),
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;quotes&quot;",
    );
  });
});

describe("reservationHtml", () => {
  it("escapes guest-submitted name and message so they can't inject markup", () => {
    const record = baseReservation({
      firstName: "<img src=x onerror=alert(1)>",
      message: "click here <a href=\"javascript:alert(1)\">now</a>",
    });
    const html = reservationHtml(record);
    assert.ok(!html.includes("<img src=x"));
    assert.ok(!html.includes('href="javascript:alert(1)"'));
    assert.ok(html.includes("&lt;img src=x"));
  });

  it("includes the guest's real name and email for a normal submission", () => {
    const record = baseReservation();
    const html = reservationHtml(record);
    assert.ok(html.includes("Ada Okonkwo"));
    assert.ok(html.includes("ada@example.com"));
  });

  it("preserves newlines in the message as <br /> after escaping", () => {
    const record = baseReservation({ message: "Line one\nLine two" });
    const html = reservationHtml(record);
    assert.ok(html.includes("Line one<br />Line two"));
  });
});

describe("feedbackHtml", () => {
  it("escapes guest-submitted name and message", () => {
    const record = baseFeedback({
      firstName: "<script>alert(1)</script>",
      message: "<b>bold</b> feedback",
    });
    const html = feedbackHtml(record);
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("<b>bold</b>"));
  });

  it("omits the phone line when phone is not provided", () => {
    const record = baseFeedback();
    const html = feedbackHtml(record);
    assert.ok(!html.includes("<strong>Phone:</strong>"));
  });

  it("includes an escaped phone line when provided", () => {
    const record = baseFeedback({ phone: "+2348012345678" });
    const html = feedbackHtml(record);
    assert.ok(html.includes("+2348012345678"));
  });
});

describe("formatNairaFromKobo", () => {
  it("converts kobo to a formatted NGN amount", () => {
    assert.equal(formatNairaFromKobo(500000), "₦5,000.00");
  });

  it("handles zero", () => {
    assert.equal(formatNairaFromKobo(0), "₦0.00");
  });
});

describe("paymentConfirmationHtml", () => {
  it("includes the correct amount, reference, and item label", () => {
    const html = paymentConfirmationHtml({
      email: "guest@example.com",
      reference: "RH-20260901-abcdef",
      amountKobo: 500000,
      itemLabel: "guest-room — 2 night(s) deposit (20%)",
    });
    assert.ok(html.includes("₦5,000.00"));
    assert.ok(html.includes("RH-20260901-abcdef"));
    assert.ok(html.includes("guest-room — 2 night(s) deposit (20%)"));
  });

  it("escapes the item label even though it's normally system-generated", () => {
    const html = paymentConfirmationHtml({
      email: "guest@example.com",
      reference: "RH-20260901-abcdef",
      amountKobo: 500000,
      itemLabel: "<script>alert(1)</script>",
    });
    assert.ok(!html.includes("<script>"));
  });
});
