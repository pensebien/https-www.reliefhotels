import { rooms } from "@/content/site";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { sniffImage } from "@/lib/image-sniff";
import { requireStaffAccess } from "@/lib/staff-auth-guard";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = "room-photos";

/** Upload one room photo; returns its URL for the room setup's photo list. */
export async function POST(request: Request) {
  const access = await requireStaffAccess(request, ["manager"]);
  if (!access.ok) return access.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const roomId = String(form?.get("roomId") ?? "");
  if (!(file instanceof File) || !rooms.some((r) => r.id === roomId)) {
    return NextResponse.json({ error: "Choose a room type and an image file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is larger than 5 MB" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) {
    return NextResponse.json({ error: "Upload a JPEG, PNG or WebP image" }, { status: 400 });
  }

  const name = `${roomId}/${randomUUID()}.${kind.ext}`;

  try {
    if (isSupabaseEnabled()) {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(name, bytes, { contentType: kind.contentType, upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
      return NextResponse.json({ ok: true, url: data.publicUrl });
    }

    // File mode (local dev): served by Next from public/.
    const dest = path.join(process.cwd(), "public", "uploads", "rooms", name);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, bytes);
    return NextResponse.json({ ok: true, url: `/uploads/rooms/${name}` });
  } catch (error) {
    console.error("[staff/settings/rooms/photos]", error);
    return NextResponse.json({ error: "Unable to save the photo" }, { status: 500 });
  }
}
