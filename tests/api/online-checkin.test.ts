import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

const KEY = "relief-demo-2026";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function ymd(offsetDays: number) {
  const d = new Date(Date.now() + 3_600_000);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function confirmedBooking(checkInOffset: number, nights = 2) {
  const { addReservation } = await import("@/lib/demo-store");
  return addReservation({
    firstName: "Check", lastName: "In", email: `ci-${Date.now()}-${Math.random()}@example.com`, itemType: "room",
    roomId: "guest-room", checkIn: ymd(checkInOffset), checkOut: ymd(checkInOffset + nights), nights, guests: 2,
    stayPreference: "t", message: "t", emailSent: false, status: "confirmed",
  });
}

function checkinForm(id: string, t: string, photo?: Uint8Array) {
  const form = new FormData();
  form.set("id", id);
  form.set("t", t);
  form.set("arrivalTime", "15:30");
  form.set("nationality", "Nigerian");
  form.set("address", "12 Marian Road, Calabar");
  form.set("purposeOfStay", "business");
  form.set("idType", "national_id");
  form.set("idNumber", "12345678901");
  form.set("consent", "yes");
  if (photo) form.set("idPhoto", new File([photo.slice().buffer as ArrayBuffer], "id.png"));
  return new Request("http://localhost/api/booking/manage/checkin", { method: "POST", body: form });
}

describe("Online check-in API", () => {
  before(() => {
    process.env.DEMO_MODE = "true";
    process.env.STAFF_AUTH_ENABLED = "false";
    delete process.env.DEMO_DASHBOARD_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("lets a confirmed guest check in once, keeps the ID photo private, and shows staff the details", async () => {
    const booking = await confirmedBooking(2);
    const { signReservationId } = await import("@/lib/booking-engine/manage-link");
    const t = signReservationId(booking.id);

    const { GET: manage } = await import("@/app/api/booking/manage/route");
    const view = (await (await manage(new Request(`http://localhost/api/booking/manage?id=${booking.id}&t=${t}`))).json()) as { checkin: { state: string } };
    assert.equal(view.checkin.state, "open");

    const { POST } = await import("@/app/api/booking/manage/checkin/route");
    const fake = await POST(checkinForm(booking.id, t, new TextEncoder().encode("not an image at all")));
    assert.equal(fake.status, 400);
    const ok = await POST(checkinForm(booking.id, t, PNG));
    assert.equal(ok.status, 200);
    assert.equal((await POST(checkinForm(booking.id, t, PNG))).status, 409, "only once");

    const after = (await (await manage(new Request(`http://localhost/api/booking/manage?id=${booking.id}&t=${t}`))).json()) as { checkin: { state: string; instructions?: string } };
    assert.equal(after.checkin.state, "done");
    assert.ok(after.checkin.instructions);

    const { GET: staffView } = await import("@/app/api/staff/reservations/[id]/checkin/route");
    const details = (await (await staffView(new Request(`http://localhost/x?key=${KEY}`), ctx(booking.id))).json()) as {
      checkin: { arrivalTime: string; idNumber: string; hasPhoto: boolean; idPhotoPath?: string };
    };
    assert.equal(details.checkin.arrivalTime, "15:30");
    assert.equal(details.checkin.hasPhoto, true);
    assert.equal(details.checkin.idPhotoPath, undefined, "storage path is not exposed");

    const { GET: photo } = await import("@/app/api/staff/reservations/[id]/checkin/photo/route");
    assert.equal((await photo(new Request("http://localhost/x"), ctx(booking.id))).status, 401);
    const img = await photo(new Request(`http://localhost/x?key=${KEY}`), ctx(booking.id));
    assert.equal(img.status, 200);
    assert.equal(img.headers.get("content-type"), "image/png");
    assert.equal(img.headers.get("cache-control"), "private, no-store");
  });

  it("isn't open for unpaid bookings and purges ID data after the retention period", async () => {
    const { addReservation } = await import("@/lib/demo-store");
    const unpaid = await addReservation({
      firstName: "Un", lastName: "Paid", email: "u@example.com", itemType: "room", roomId: "guest-room",
      checkIn: ymd(1), checkOut: ymd(2), nights: 1, guests: 1, stayPreference: "t", message: "t", emailSent: false, status: "pending",
    });
    const { signReservationId } = await import("@/lib/booking-engine/manage-link");
    const { POST } = await import("@/app/api/booking/manage/checkin/route");
    assert.equal((await POST(checkinForm(unpaid.id, signReservationId(unpaid.id), PNG))).status, 409);

    // Checked in for a stay that ended 40 days ago → purged with 30-day retention.
    const old = await confirmedBooking(-42, 2);
    const { saveCheckin, findCheckin, purgeExpiredIdData, readIdPhoto } = await import("@/lib/checkin/store");
    await saveCheckin(
      { reservationId: old.id, arrivalTime: "12:00", nationality: "Ghanaian", address: "Accra", purposeOfStay: "leisure", idType: "passport", idNumber: "G1234567" },
      { bytes: PNG, ext: "png", contentType: "image/png" },
    );
    const recent = await confirmedBooking(-5, 2);
    await saveCheckin(
      { reservationId: recent.id, arrivalTime: "12:00", nationality: "Nigerian", address: "Uyo", purposeOfStay: "leisure", idType: "passport", idNumber: "A7654321" },
    );
    assert.ok((await purgeExpiredIdData(30)) >= 1);
    const purged = (await findCheckin(old.id))!;
    assert.equal(purged.idNumber, undefined);
    assert.ok(purged.purgedAt);
    assert.equal(await readIdPhoto(purged), null);
    assert.equal(purged.nationality, "Ghanaian", "non-ID details stay with the stay record");
    assert.equal((await findCheckin(recent.id))?.idNumber, "A7654321", "recent stays are kept");
  });
});
