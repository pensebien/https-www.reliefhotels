import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import {
  sendFeedbackEmail,
  sendPaymentConfirmationEmail,
  sendReservationEmail,
} from "@/lib/email";
import type { ReservationRecord } from "@/lib/demo-store";
import type { GuestFeedback } from "@/lib/inquiry-store";

function baseReservation(): ReservationRecord {
  return {
    id: "res-1",
    firstName: "Ada",
    lastName: "Okonkwo",
    email: "ada@example.com",
    itemType: "room",
    guests: 2,
    stayPreference: "room:guest-room",
    message: "No special requests",
    status: "pending",
    source: "live",
    createdAt: "2026-09-01T00:00:00.000Z",
    emailSent: false,
  };
}

function baseFeedback(): GuestFeedback {
  return {
    id: "fb-1",
    firstName: "Chidi",
    lastName: "Eze",
    email: "chidi@example.com",
    message: "Loved the stay",
    createdAt: "2026-09-01T00:00:00.000Z",
  };
}

describe("email sending — demo mode (RESEND_API_KEY unset)", () => {
  const originalKey = process.env.RESEND_API_KEY;

  before(() => {
    delete process.env.RESEND_API_KEY;
  });

  after(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it("sendReservationEmail returns false and never calls fetch", async () => {
    const fetchMock = mock.method(globalThis, "fetch");
    const sent = await sendReservationEmail(baseReservation());
    assert.equal(sent, false);
    assert.equal(fetchMock.mock.callCount(), 0);
    fetchMock.mock.restore();
  });

  it("sendFeedbackEmail returns false and never calls fetch", async () => {
    const fetchMock = mock.method(globalThis, "fetch");
    const sent = await sendFeedbackEmail(baseFeedback());
    assert.equal(sent, false);
    assert.equal(fetchMock.mock.callCount(), 0);
    fetchMock.mock.restore();
  });

  it("sendPaymentConfirmationEmail returns false and never calls fetch", async () => {
    const fetchMock = mock.method(globalThis, "fetch");
    const sent = await sendPaymentConfirmationEmail({
      email: "guest@example.com",
      reference: "RH-20260901-abcdef",
      amountKobo: 500000,
      itemLabel: "guest-room deposit",
    });
    assert.equal(sent, false);
    assert.equal(fetchMock.mock.callCount(), 0);
    fetchMock.mock.restore();
  });
});

describe("email sending — configured (RESEND_API_KEY set, fetch mocked)", () => {
  const originalKey = process.env.RESEND_API_KEY;

  before(() => {
    process.env.RESEND_API_KEY = "re_test_123";
  });

  after(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it("sendReservationEmail POSTs to Resend with reply-to set to the guest", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ id: "email_1" }), { status: 200 }),
    );

    const sent = await sendReservationEmail(baseReservation());
    assert.equal(sent, true);
    assert.equal(fetchMock.mock.callCount(), 1);

    const [url, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(
      (init.headers as Record<string, string>).Authorization,
      "Bearer re_test_123",
    );
    const body = JSON.parse(init.body as string);
    assert.equal(body.reply_to, "ada@example.com");
    assert.ok(body.subject.includes("Ada Okonkwo"));
    assert.ok(body.html.includes("Ada Okonkwo"));

    fetchMock.mock.restore();
  });

  it("sendFeedbackEmail POSTs with reply-to set to the guest", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ id: "email_2" }), { status: 200 }),
    );

    const sent = await sendFeedbackEmail(baseFeedback());
    assert.equal(sent, true);

    const [, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    assert.equal(body.reply_to, "chidi@example.com");

    fetchMock.mock.restore();
  });

  it("sendPaymentConfirmationEmail sends to the guest and BCCs the hotel", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ id: "email_3" }), { status: 200 }),
    );

    const sent = await sendPaymentConfirmationEmail({
      email: "guest@example.com",
      reference: "RH-20260901-abcdef",
      amountKobo: 500000,
      itemLabel: "guest-room deposit",
    });
    assert.equal(sent, true);

    const [, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    assert.deepEqual(body.to, ["guest@example.com"]);
    assert.ok(Array.isArray(body.bcc) && body.bcc.length === 1);
    assert.ok(body.subject.includes("RH-20260901-abcdef"));

    fetchMock.mock.restore();
  });

  it("returns false (does not throw) when Resend responds with an error", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response("rate limited", { status: 429 }),
    );

    const sent = await sendPaymentConfirmationEmail({
      email: "guest@example.com",
      reference: "RH-20260901-abcdef",
      amountKobo: 500000,
      itemLabel: "guest-room deposit",
    });
    assert.equal(sent, false);

    fetchMock.mock.restore();
  });
});
