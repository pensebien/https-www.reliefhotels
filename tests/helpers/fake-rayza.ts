import assert from "node:assert/strict";

/**
 * A fake RAYZA Connect v4.2 that behaves like the live sandbox: it rewrites
 * references not starting with "BK-", rejects bookings without an amount,
 * enforces occupancy and availability (409), and cancel is idempotent (200)
 * while unknown references 404. Each Relief room type gets a RAYZA type of
 * the same id, so linking is one-to-one.
 */
export const RAYZA_BASE = "https://rayza.test";

type FakeType = { id: string; numbers: string[]; maxOccupancy: number; priceNgn: number; priceWithTaxNgn: number };
type FakeBooking = { ref: string; status: "active" | "cancelled"; body: Record<string, unknown>; checkIn: string; checkOut: string };

const DEFAULT_TYPES: FakeType[] = [
  { id: "guest-room", numbers: ["101", "102", "103"], maxOccupancy: 3, priceNgn: 46000, priceWithTaxNgn: 50000 },
  { id: "executive-room", numbers: ["201", "202"], maxOccupancy: 2, priceNgn: 60000, priceWithTaxNgn: 65000 },
  { id: "signature-suite", numbers: ["301", "302"], maxOccupancy: 4, priceNgn: 90000, priceWithTaxNgn: 100000 },
  { id: "presidential-suite", numbers: ["401"], maxOccupancy: 4, priceNgn: 180000, priceWithTaxNgn: 200000 },
];

export const fakeRayza = {
  types: DEFAULT_TYPES.map((t) => ({ ...t })),
  /** Rooms the HMS front desk (or an OTA) has taken, per type, for any dates. */
  frontDesk: {} as Record<string, number>,
  forceConflict: false,
  down: false,
  bookings: new Map<string, FakeBooking>(),
  reset() {
    this.types = DEFAULT_TYPES.map((t) => ({ ...t }));
    this.frontDesk = {};
    this.forceConflict = false;
    this.down = false;
    this.bookings.clear();
  },
  free(typeId: string, checkIn: string, checkOut: string) {
    const type = this.types.find((t) => t.id === typeId)!;
    const taken = [...this.bookings.values()].filter(
      (b) => b.status === "active" && b.body.room_identifier === typeId && b.checkIn < checkOut && b.checkOut > checkIn,
    ).length;
    return Math.max(0, type.numbers.length - (this.frontDesk[typeId] ?? 0) - taken);
  },
  active() {
    return [...this.bookings.values()].filter((b) => b.status === "active");
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const rejected = (code: string, message: string, status: number) => json({ status: "rejected", error: { code, message } }, status);

function handle(url: URL, init?: RequestInit): Response {
  if (fakeRayza.down) throw new TypeError("fetch failed");
  assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-key");
  const method = init?.method ?? "GET";
  if (method === "GET" && url.pathname === "/v1/rooms") {
    const checkIn = url.searchParams.get("check_in");
    const checkOut = url.searchParams.get("check_out");
    return json({
      currency: "NGN",
      rooms: fakeRayza.types.map((t) => {
        const free = checkIn && checkOut ? fakeRayza.free(t.id, checkIn, checkOut) : t.numbers.length;
        return {
          room_type_identifier: t.id,
          room_type_name: t.id,
          room_numbers: checkIn ? t.numbers.slice(0, free) : t.numbers,
          total_rooms: t.numbers.length,
          available_count: free,
          available: free > 0,
          base_price: t.priceNgn,
          tax_exclusive_price: t.priceNgn,
          tax_inclusive_price: t.priceWithTaxNgn,
          min_los: 1,
          capacity: { base_occupancy: 1, max_occupancy: t.maxOccupancy },
          closed_to_arrival: false,
          closed_to_departure: false,
        };
      }),
    });
  }
  if (method === "POST" && url.pathname === "/v1/bookings") {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    if (body.amount === undefined) return rejected("VALIDATION_ERROR", "body -> amount: Field required", 422);
    const type = fakeRayza.types.find((t) => t.id === body.room_identifier);
    if (!type) return rejected("INVALID_ROOM_TYPE", "Room type not found", 422);
    if ((body.adults as number) > type.maxOccupancy) return rejected("OCCUPANCY_LIMIT_EXCEEDED", "Too many guests", 422);
    const sent = String(body.booking_reference);
    const ref = sent.startsWith("BK-") ? sent : `BK-${sent.replace(/^([A-Za-z]+-)+/, "")}`;
    if (fakeRayza.bookings.has(ref)) return json({ status: "already_received", booking_reference: ref }, 200);
    if (fakeRayza.forceConflict || fakeRayza.free(type.id, String(body.check_in), String(body.check_out)) < 1) {
      return rejected("ROOM_UNAVAILABLE", "The selected room is no longer available for these dates.", 409);
    }
    fakeRayza.bookings.set(ref, { ref, status: "active", body, checkIn: String(body.check_in), checkOut: String(body.check_out) });
    return json({ status: "received", id: "x", booking_reference: ref }, 201);
  }
  const cancel = url.pathname.match(/^\/v1\/bookings\/(.+)\/cancel$/);
  if (method === "POST" && cancel) {
    const booking = fakeRayza.bookings.get(decodeURIComponent(cancel[1]));
    if (!booking) return rejected("NOT_FOUND", "Booking reference not found", 404);
    const was = booking.status;
    booking.status = "cancelled";
    return json({ status: was === "cancelled" ? "already_cancelled" : "cancelled" });
  }
  return json({ detail: "Not Found" }, 404);
}

let realFetch: typeof fetch | null = null;

/**
 * Turn RAYZA on against the fake, and link every Relief room type to the
 * RAYZA type of the same id. Call from a test file's `before`.
 */
export async function installFakeRayza(): Promise<void> {
  process.env.RAYZA_CONNECT_ENABLED = "true";
  process.env.RAYZA_API_KEY = "test-key";
  process.env.RAYZA_BASE_URL = RAYZA_BASE;
  realFetch = globalThis.fetch;
  const passthrough = realFetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    if (url.origin !== RAYZA_BASE) return passthrough(input, init);
    return handle(url, init);
  }) as typeof fetch;
  fakeRayza.reset();
  const { saveRayzaRoomLinks, clearRayzaCache } = await import("@/lib/integrations/rayza-sync");
  await saveRayzaRoomLinks({ links: Object.fromEntries(DEFAULT_TYPES.map((t) => [t.id, t.id])) });
  clearRayzaCache();
}

export async function resetFakeRayza(): Promise<void> {
  fakeRayza.reset();
  const { clearRayzaCache } = await import("@/lib/integrations/rayza-sync");
  clearRayzaCache();
}

export async function uninstallFakeRayza(): Promise<void> {
  if (realFetch) globalThis.fetch = realFetch;
  realFetch = null;
  const { saveRayzaRoomLinks } = await import("@/lib/integrations/rayza-sync");
  await saveRayzaRoomLinks({ links: {} });
  delete process.env.RAYZA_CONNECT_ENABLED;
  delete process.env.RAYZA_API_KEY;
  delete process.env.RAYZA_BASE_URL;
}
