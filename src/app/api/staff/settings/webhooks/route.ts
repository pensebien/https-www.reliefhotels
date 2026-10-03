import { getWebhooks, newWebhookSecret, recentDeliveries, saveWebhooks, WEBHOOK_EVENTS } from "@/lib/integrations/webhooks";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const [hooks, deliveries] = await Promise.all([getWebhooks(), recentDeliveries(30)]);
  return NextResponse.json({
    ok: true,
    hooks,
    events: WEBHOOK_EVENTS,
    deliveries: deliveries.map(({ body: _body, ...d }) => d),
  });
}

/** Save endpoints; new ones (no secret yet) get a generated signing secret. */
export async function PUT(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;
  const body = (await request.json().catch(() => null)) as { hooks?: Record<string, unknown>[] } | null;
  const hooks = (body?.hooks ?? []).map((h) => ({ ...h, secret: typeof h.secret === "string" && h.secret ? h.secret : newWebhookSecret() }));
  try {
    return NextResponse.json({ ok: true, hooks: await saveWebhooks({ hooks }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid webhooks" }, { status: 400 });
  }
}
