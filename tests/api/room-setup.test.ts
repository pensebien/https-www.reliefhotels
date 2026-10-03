import { dataPath } from "@/lib/data-dir";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";

const KEY = "relief-demo-2026";
const SETUP_FILE = dataPath("settings", "room_setup.json");
const UPLOADS = path.join(process.cwd(), "public", "uploads", "rooms");

function setTestEnv() {
  process.env.DEMO_MODE = "true";
  process.env.NOTIFY_CHANNEL = "console";
  process.env.STAFF_AUTH_ENABLED = "false";
  delete process.env.DEMO_DASHBOARD_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

let seq = 0;
function stay() {
  const base = new Date(Date.UTC(2033, 0, 1 + (Math.floor(Date.now() / 1000) % 2000) * 2 + seq++ * 5));
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + 2);
  return { checkIn: base.toISOString().slice(0, 10), checkOut: out.toISOString().slice(0, 10) };
}

describe("Room setup API", () => {
  before(setTestEnv);
  after(async () => {
    await fs.rm(SETUP_FILE, { force: true });
    const { clearSettingsCache } = await import("@/lib/settings-store");
    clearSettingsCache();
  });

  it("saves inventory, room numbers and the online switch, and the engine follows them", async () => {
    const { GET, PUT } = await import("@/app/api/staff/settings/rooms/route");
    const current = (await (await GET(new Request(`http://localhost/api/staff/settings/rooms?key=${KEY}`))).json()) as {
      setup: { rooms: { roomId: string; inventory: number; unitLabels: string[]; bookableOnline: boolean; photos: string[] }[] };
    };
    const rooms = current.setup.rooms.map((r) =>
      r.roomId === "presidential-suite"
        ? { ...r, inventory: 2, unitLabels: ["PH1", "PH2"] }
        : r.roomId === "signature-suite"
          ? { ...r, bookableOnline: false }
          : r,
    );

    const bad = await PUT(new Request(`http://localhost/api/staff/settings/rooms?key=${KEY}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rooms: rooms.map((r) => (r.roomId === "presidential-suite" ? { ...r, unitLabels: ["PH1"] } : r)) }),
    }));
    assert.equal(bad.status, 400);

    const saved = await PUT(new Request(`http://localhost/api/staff/settings/rooms?key=${KEY}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rooms }),
    }));
    assert.equal(saved.status, 200, JSON.stringify(await saved.clone().json()));

    // Presidential suite now has 2 rooms: two bookings for the same dates both succeed, a third is refused.
    const { POST } = await import("@/app/api/reservations/route");
    const dates = stay();
    const book = (roomId: string, d = dates) =>
      POST(new Request("http://localhost/api/reservations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: "Room", lastName: "Setup", email: `rs-${Date.now()}@example.com`, phone: "+2348000000000",
          stayPreference: "test", message: "test", itemType: "room", roomId, guests: 2, nights: 2, ...d,
        }),
      }));
    assert.equal((await book("presidential-suite")).status, 200);
    assert.equal((await book("presidential-suite")).status, 200);
    assert.equal((await book("presidential-suite")).status, 409);

    // Signature suite is not bookable online.
    const offline = await book("signature-suite", stay());
    assert.equal(offline.status, 422);
    assert.equal(((await offline.json()) as { code?: string }).code, "not_bookable_online");

    const { GET: availability } = await import("@/app/api/rooms/availability/route");
    const d2 = stay();
    const av = (await (await availability(new Request(`http://localhost/api/rooms/availability?checkIn=${d2.checkIn}&checkOut=${d2.checkOut}&guests=2`))).json()) as {
      restricted: { id: string; code: string }[];
    };
    assert.ok(av.restricted.some((r) => r.id === "signature-suite" && r.code === "not_bookable_online"));

    const { GET: catalog } = await import("@/app/api/rooms/catalog/route");
    const cat = (await (await catalog()).json()) as { rooms: { id: string; bookableOnline: boolean; inventory?: number }[] };
    assert.equal(cat.rooms.find((r) => r.id === "signature-suite")?.bookableOnline, false);
    assert.equal(cat.rooms[0].inventory, undefined, "inventory stays private");
  });

  it("accepts real images only for photo upload", async () => {
    const { POST } = await import("@/app/api/staff/settings/rooms/photos/route");
    const upload = (bytes: Uint8Array, name: string) => {
      const form = new FormData();
      form.set("roomId", "guest-room");
      form.set("file", new File([bytes.slice().buffer as ArrayBuffer], name));
      return POST(new Request(`http://localhost/api/staff/settings/rooms/photos?key=${KEY}`, { method: "POST", body: form }));
    };
    const fake = await upload(new TextEncoder().encode("<script>alert(1)</script>"), "evil.png");
    assert.equal(fake.status, 400);

    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const ok = await upload(png, "photo.png");
    const body = (await ok.json()) as { url?: string };
    assert.equal(ok.status, 200);
    assert.match(body.url ?? "", /^\/uploads\/rooms\/guest-room\/[0-9a-f-]+\.png$/);
    await fs.rm(path.join(UPLOADS, body.url!.replace("/uploads/rooms/", "")), { force: true });
  });
});
