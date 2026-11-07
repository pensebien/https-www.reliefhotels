import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { installFakeRayza, uninstallFakeRayza } from "../helpers/fake-rayza";

/**
 * Manual bank-transfer flow: booking → WhatsApp instructions to the guest and
 * an alert to the front desk → desk marks it paid (with audit) → guest receipt.
 */
const KEY = "relief-demo-2026";
const DESK = "2348099990000";
const GUEST = "2348031112222";
const RUN = Date.now().toString(36);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose JSON responses in a test
type Json = Record<string, any>;
type Sent = { to: string; text: string };
const sent: Sent[] = [];
let wrappedFetch: typeof fetch;
let beforeWrap: typeof fetch;

let seq = 0;
function body(overrides: Record<string, unknown> = {}) {
  const base = new Date(Date.UTC(2041, 0, 1 + ((Math.floor(Date.now() / 1000) % 3000) * 3 + seq++ * 3)));
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  return {
    firstName: "Ada",
    lastName: "Transfer",
    email: `transfer-${Date.now()}-${seq}@example.com`,
    phone: "+2348031112222",
    whatsappNumber: "0803 111 2222",
    paymentMode: "transfer",
    stayPreference: "guest-room",
    message: "transfer test",
    itemType: "room",
    roomId: "guest-room",
    checkIn: base.toISOString().slice(0, 10),
    checkOut: out.toISOString().slice(0, 10),
    nights: 2,
    guests: 2,
    ...overrides,
  };
}

const post = async (payload: unknown) => {
  const { POST } = await import("@/app/api/reservations/route");
  const res = await POST(
    new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return { status: res.status, json: (await res.json()) as Json };
};

const ops = async (payload: Record<string, unknown>) => {
  const { POST } = await import("@/app/api/staff/ops/route");
  const res = await POST(
    new Request(`http://localhost/api/staff/ops?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return { status: res.status, json: (await res.json()) as Json };
};

describe("normalizeWhatsappNumber", () => {
  it("accepts local, plus and 00 formats and rejects junk", async () => {
    const { normalizeWhatsappNumber: n } = await import("@/lib/whatsapp-number");
    assert.equal(n("0803 111 2222"), "2348031112222");
    assert.equal(n("+234 803 111 2222"), "2348031112222");
    assert.equal(n("2348031112222"), "2348031112222");
    assert.equal(n("00234 803 111 2222"), "2348031112222");
    assert.equal(n("8031112222"), "2348031112222");
    assert.equal(n("+44 7700 900123"), "447700900123");
    assert.equal(n("12345"), null);
    assert.equal(n("abc"), null);
  });
});

describe("Pay by transfer over WhatsApp", () => {
  before(async () => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    process.env.NOTIFY_CHANNEL = "both";
    process.env.MANAGER_PHONE = "+2348099990001";
    process.env.FRONT_DESK_WHATSAPP = `+${DESK}`;
    process.env.TERMII_API_KEY = "termii-test";
    process.env.TERMII_WHATSAPP_DEVICE_ID = "relief";
    process.env.WHATSAPP_PROVIDER = "termii";
    process.env.TRANSFER_ACCOUNT_NUMBER = "6012345678";
    process.env.TRANSFER_ACCOUNT_NAME = "Relief Hotels and Suites";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await installFakeRayza();
    beforeWrap = globalThis.fetch;
    wrappedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url === "https://api.termii.com/api/sms/send") {
        const b = JSON.parse(String(init?.body));
        assert.equal(b.channel, "whatsapp");
        assert.equal(b.type, "plain");
        assert.equal(b.from, "relief");
        assert.equal(b.api_key, "termii-test");
        sent.push({ to: b.to, text: b.sms });
        return new Response("{}", { status: 200 });
      }
      if (url.includes("termii.com")) return new Response("{}", { status: 200 });
      return beforeWrap(input, init);
    }) as typeof fetch;
    globalThis.fetch = wrappedFetch;
  });

  after(async () => {
    globalThis.fetch = beforeWrap;
    await uninstallFakeRayza();
    delete process.env.TERMII_API_KEY;
    delete process.env.TRANSFER_ACCOUNT_NUMBER;
    delete process.env.TRANSFER_ACCOUNT_NAME;
    process.env.NOTIFY_CHANNEL = "console";
  });

  it("requires a valid WhatsApp number for room bookings", async () => {
    const missing = await post(body({ whatsappNumber: undefined }));
    assert.equal(missing.status, 400);
    const bad = await post(body({ whatsappNumber: "123" }));
    assert.equal(bad.status, 400);
  });

  it("sends the guest the account + exact amount and alerts the front desk", async () => {
    sent.length = 0;
    const { status, json } = await post(body());
    assert.equal(status, 200, JSON.stringify(json));
    assert.equal(json.transfer.accountNumber, "6012345678");
    assert.equal(json.transfer.whatsappSent, true);
    assert.ok(json.transfer.amountNgn > 0);
    assert.match(json.transfer.reference, /^[0-9A-F]{8}$/);

    const guestMsg = sent.find((m) => m.to === GUEST);
    const deskMsg = sent.find((m) => m.to === DESK);
    assert.ok(guestMsg, "guest was messaged");
    assert.ok(deskMsg, "front desk was alerted");
    const amount = `₦${json.transfer.amountNgn.toLocaleString("en-NG")}`;
    assert.match(guestMsg.text, new RegExp(`EXACT amount of ${amount}`));
    assert.ok(guestMsg.text.includes(`Reference #${json.transfer.reference}`));
    assert.ok(guestMsg.text.includes("6012345678"));
    assert.ok(guestMsg.text.includes("Relief Hotels and Suites"));
    assert.ok(deskMsg.text.includes("Ada Transfer"));
    assert.ok(deskMsg.text.includes(`+${GUEST}`));
    assert.ok(deskMsg.text.includes(amount));
    assert.ok(deskMsg.text.includes(`#${json.transfer.reference}`));

    const { findReservationById } = await import("@/lib/demo-store");
    const r = (await findReservationById(json.id))!;
    assert.equal(r.whatsappNumber, GUEST);
    assert.equal(r.paymentMode, "transfer");
    assert.equal(r.status, "pending");
  });

  it("refuses transfer bookings before holding a room when no account is configured", async () => {
    const saved = process.env.TRANSFER_ACCOUNT_NUMBER;
    delete process.env.TRANSFER_ACCOUNT_NUMBER;
    try {
      const { status, json } = await post(body());
      assert.equal(status, 503);
      assert.equal(json.code, "transfer_unavailable");
    } finally {
      process.env.TRANSFER_ACCOUNT_NUMBER = saved;
    }
  });

  it("card bookings send no transfer messages", async () => {
    sent.length = 0;
    const { status, json } = await post(body({ paymentMode: "card" }));
    assert.equal(status, 200);
    assert.equal(json.transfer, undefined);
    assert.equal(sent.length, 0);
  });

  it("marking paid confirms, records who/when, and WhatsApps the receipt once", async () => {
    const booked = await post(body());
    sent.length = 0;
    const amountNgn = booked.json.transfer.amountNgn as number;

    const paid = await ops({ action: "record_transfer", reservationId: booked.json.id, amountNgn, moniepointRef: `MP-TEST-1-${RUN}` });
    assert.equal(paid.status, 200, JSON.stringify(paid.json));
    const receipt = sent.find((m) => m.to === GUEST && /Payment confirmed/.test(m.text));
    assert.ok(receipt, "guest got the payment-confirmed message");
    assert.ok(receipt.text.includes(`#${booked.json.transfer.reference}`));

    const { findReservationById } = await import("@/lib/demo-store");
    const r = (await findReservationById(booked.json.id))!;
    assert.equal(r.status, "confirmed");
    assert.equal(r.moniepointPaymentRef, `MP-TEST-1-${RUN}`);
    assert.ok(r.paymentConfirmedBy);
    assert.ok(r.paymentConfirmedAt);

    // A second tap with the same POS reference is refused, so nothing is double-counted.
    sent.length = 0;
    const again = await ops({ action: "record_transfer", reservationId: booked.json.id, amountNgn, moniepointRef: `MP-TEST-1-${RUN}` });
    assert.equal(again.status, 409);
    assert.equal(sent.filter((m) => /Payment confirmed/.test(m.text)).length, 0);

    // The same reference cannot confirm a different booking.
    const other = await post(body());
    const reuse = await ops({ action: "record_transfer", reservationId: other.json.id, amountNgn, moniepointRef: `MP-TEST-1-${RUN}` });
    assert.equal(reuse.status, 409);
  });

  it("the desk alert carries a confirm link that only works for that booking", async () => {
    sent.length = 0;
    const booked = await post(body());
    const alert = sent.find((m) => m.to === DESK)!;
    const link = alert.text.match(/https?:\/\/\S+\/confirm-payment\?\S+/)?.[0];
    assert.ok(link, "alert contains the confirm link");
    const url = new URL(link);
    const id = url.searchParams.get("id")!;
    const token = url.searchParams.get("t")!;
    assert.equal(id, booked.json.id);

    const { isValidConfirmToken } = await import("@/lib/booking-engine/confirm-link");
    const { signReservationId } = await import("@/lib/booking-engine/manage-link");
    assert.equal(isValidConfirmToken(id, token), true);
    assert.equal(isValidConfirmToken("another-booking", token), false);
    // A guest's manage-booking link must never confirm a payment.
    assert.equal(isValidConfirmToken(id, signReservationId(id)), false);
  });

  it("opening the confirm page never confirms; the POST does, once", async () => {
    sent.length = 0;
    const booked = await post(body());
    const id = booked.json.id as string;
    const { signConfirmToken } = await import("@/lib/booking-engine/confirm-link");
    const t = signConfirmToken(id);
    const amountNgn = booked.json.transfer.amountNgn as number;

    const Page = (await import("@/app/[locale]/confirm-payment/page")).default;
    await Page({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ id, t }) }).catch(() => null);
    const { findReservationById } = await import("@/lib/demo-store");
    assert.equal((await findReservationById(id))!.status, "pending", "viewing must not confirm");

    const confirm = async (payload: Record<string, unknown>) => {
      const { POST } = await import("@/app/api/confirm-payment/route");
      const res = await POST(
        new Request("http://localhost/api/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );
      return { status: res.status, json: (await res.json()) as Json };
    };

    assert.equal((await confirm({ id, t: "bad-token", amountNgn })).status, 403);
    assert.equal((await findReservationById(id))!.status, "pending");

    sent.length = 0;
    const ok = await confirm({ id, t, amountNgn, moniepointRef: `MP-LINK-1-${RUN}` });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const r = (await findReservationById(id))!;
    assert.equal(r.status, "confirmed");
    assert.match(r.paymentConfirmedBy ?? "", /^WhatsApp link \(CS \+2348099990000\)$/);
    assert.ok(r.paymentConfirmedAt);
    assert.equal(sent.filter((m) => m.to === GUEST && /Payment confirmed/.test(m.text)).length, 1);

    sent.length = 0;
    assert.equal((await confirm({ id, t, amountNgn })).status, 409, "second tap is refused");
    assert.equal(sent.length, 0);
  });

  it("a cancelled booking can't be confirmed from the link", async () => {
    const booked = await post(body());
    const id = booked.json.id as string;
    await ops({ action: "cancel", reservationId: id });
    const { signConfirmToken } = await import("@/lib/booking-engine/confirm-link");
    const { POST } = await import("@/app/api/confirm-payment/route");
    const res = await POST(
      new Request("http://localhost/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, t: signConfirmToken(id), amountNgn: 1000 }),
      }),
    );
    assert.equal(res.status, 409);
  });

  it("the ops board exposes the reference, amount and quick replies", async () => {
    const booked = await post(body());
    const { loadOpsBoard } = await import("@/lib/staff-ops");
    const row = (await loadOpsBoard()).find((r) => r.id === booked.json.id)!;
    assert.equal(row.ref, booked.json.transfer.reference);
    assert.equal(row.paymentMode, "transfer");
    assert.equal(row.amountDueNgn, booked.json.transfer.amountNgn);
    assert.equal(row.whatsappNumber, GUEST);
    assert.deepEqual(row.replies.map((x) => x.id), ["confirmed", "notFound", "wrongAmount", "reminder"]);
  });
});
