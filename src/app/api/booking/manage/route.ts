import { loadManagedBooking } from "@/lib/booking-engine/manage-service";
import { checkinState } from "@/lib/checkin/availability";
import { getCheckinSettings } from "@/lib/checkin/settings";
import { findCheckin } from "@/lib/checkin/store";
import { getRoomSetup, unitLabelMap } from "@/lib/room-setup";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await loadManagedBooking({
    id: searchParams.get("id"),
    t: searchParams.get("t"),
  });
  if (!result.ok) return result.response;

  const { view, config, members } = result.booking;
  const [settings, existing, roomSetup] = await Promise.all([
    getCheckinSettings(),
    findCheckin(members[0].id),
    getRoomSetup(),
  ]);
  const { state, opensOn } = checkinState(members, settings, Boolean(existing));
  const labels = unitLabelMap(roomSetup);
  return NextResponse.json({
    checkin: {
      state,
      opensOn,
      requireIdPhoto: settings.requireIdPhoto,
      instructions: state === "done" ? settings.instructions : undefined,
      roomNumbers:
        state === "done"
          ? members.flatMap((m) => (m.assignedUnits ?? []).map((u) => labels[u] ?? u))
          : undefined,
    },
    ok: true,
    booking: view,
    policy: config.cancellation,
    extras: config.extras
      .filter((e) => view.extraIds?.includes(e.id))
      .map((e) => ({ id: e.id, label: e.label })),
  });
}
