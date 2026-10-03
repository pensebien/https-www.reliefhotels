import { lagosToday } from "@/lib/guest-messages/render";
import { listGuests } from "@/lib/guests/profiles";
import { roomDisplayName } from "@/lib/room-names";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

/** Guest list with search/filter; `email=` returns one guest with their bookings. */
export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["cashier", "manager"]);
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const { guests, bookings } = await listGuests(lagosToday());

  const email = searchParams.get("email")?.trim().toLowerCase();
  if (email) {
    const guest = guests.find((g) => g.email === email);
    if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      guest,
      bookings: (bookings.get(email) ?? [])
        .sort((a, b) => (b.checkIn ?? "").localeCompare(a.checkIn ?? ""))
        .map((r) => ({
          id: r.id,
          room: roomDisplayName(r.roomId),
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          status: r.status,
          totalNgn: r.quotedTotalNgn,
        })),
    });
  }

  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const filter = searchParams.get("filter") ?? "all";
  const list = guests.filter((g) => {
    if (filter === "returning" && !g.returning) return false;
    if (filter === "upcoming" && !g.upcoming) return false;
    if (filter === "blocked" && !g.blocked) return false;
    if (!q) return true;
    return [g.name, g.email, g.phone ?? "", g.company, ...g.tags].some((v) => v.toLowerCase().includes(q));
  });
  return NextResponse.json({ ok: true, total: list.length, guests: list.slice(0, 200) });
}
