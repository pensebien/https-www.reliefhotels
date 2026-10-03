import { rooms } from "@/content/site";
import en from "../../messages/en.json";

/** English display name for a room type, for server-made documents (invoices, emails). */
export function roomDisplayName(roomId: string | undefined): string {
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return roomId ?? "Room";
  const key = room.nameKey.split(".")[1] as keyof typeof en.rooms;
  const entry = en.rooms[key] as { name?: string } | undefined;
  return entry?.name ?? room.id;
}
