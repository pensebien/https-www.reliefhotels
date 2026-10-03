/**
 * Online check-ins. ID photos are private: a private Supabase Storage bucket
 * (guest-ids), or a non-public folder under the data dir in file mode; staff
 * read them only through an authenticated route. ID number and photo are
 * purged after the retention period (see purgeExpiredIdData).
 */

import { dataPath } from "@/lib/data-dir";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { findReservationById } from "@/lib/demo-store";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";
import { promises as fs } from "fs";
import path from "path";

export type OnlineCheckin = {
  reservationId: string;
  submittedAt: string;
  arrivalTime: string;
  nationality: string;
  address: string;
  purposeOfStay: string;
  idType: string;
  /** Removed after the retention period. */
  idNumber?: string;
  idPhotoPath?: string;
  idPhotoContentType?: string;
  purgedAt?: string;
};

const FILE = dataPath("checkins.json");
const PHOTO_DIR = dataPath("guest-ids");
const BUCKET = "guest-ids";
type Store = { checkins: OnlineCheckin[] };
const empty = (): Store => ({ checkins: [] });

type Row = {
  reservation_id: string;
  submitted_at: string;
  arrival_time: string;
  nationality: string;
  address: string;
  purpose_of_stay: string;
  id_type: string;
  id_number: string | null;
  id_photo_path: string | null;
  id_photo_content_type: string | null;
  purged_at: string | null;
};

function fromRow(r: Row): OnlineCheckin {
  return {
    reservationId: r.reservation_id,
    submittedAt: r.submitted_at,
    arrivalTime: r.arrival_time,
    nationality: r.nationality,
    address: r.address,
    purposeOfStay: r.purpose_of_stay,
    idType: r.id_type,
    idNumber: r.id_number ?? undefined,
    idPhotoPath: r.id_photo_path ?? undefined,
    idPhotoContentType: r.id_photo_content_type ?? undefined,
    purgedAt: r.purged_at ?? undefined,
  };
}

export async function findCheckin(reservationId: string): Promise<OnlineCheckin | undefined> {
  if (!isSupabaseEnabled()) {
    return (await readJsonFile(FILE, empty)).checkins.find((c) => c.reservationId === reservationId);
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("online_checkins")
    .select()
    .eq("reservation_id", reservationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as Row) : undefined;
}

export async function saveCheckin(
  details: Omit<OnlineCheckin, "submittedAt" | "idPhotoPath" | "idPhotoContentType" | "purgedAt">,
  photo?: { bytes: Uint8Array; ext: string; contentType: string },
): Promise<OnlineCheckin> {
  const submittedAt = new Date().toISOString();
  const photoName = photo ? `${details.reservationId}/${Date.now()}.${photo.ext}` : undefined;
  const record: OnlineCheckin = {
    ...details,
    submittedAt,
    idPhotoPath: photoName,
    idPhotoContentType: photo?.contentType,
  };

  if (!isSupabaseEnabled()) {
    if (photo && photoName) {
      const dest = path.join(PHOTO_DIR, photoName);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, photo.bytes);
    }
    await updateJsonFile(FILE, empty, (store) => {
      store.checkins = [record, ...store.checkins.filter((c) => c.reservationId !== details.reservationId)];
    });
    return record;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  if (photo && photoName) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(photoName, photo.bytes, { contentType: photo.contentType, upsert: true });
    if (error) throw new Error(error.message);
  }
  const { error } = await supabase.from("online_checkins").upsert({
    reservation_id: record.reservationId,
    submitted_at: record.submittedAt,
    arrival_time: record.arrivalTime,
    nationality: record.nationality,
    address: record.address,
    purpose_of_stay: record.purposeOfStay,
    id_type: record.idType,
    id_number: record.idNumber ?? null,
    id_photo_path: record.idPhotoPath ?? null,
    id_photo_content_type: record.idPhotoContentType ?? null,
    purged_at: null,
  });
  if (error) throw new Error(error.message);
  return record;
}

/** The ID photo bytes for staff viewing, or null if none / purged. */
export async function readIdPhoto(
  checkin: OnlineCheckin,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!checkin.idPhotoPath || !checkin.idPhotoContentType) return null;
  if (!isSupabaseEnabled()) {
    const bytes = await fs.readFile(path.join(PHOTO_DIR, checkin.idPhotoPath)).catch(() => null);
    return bytes ? { bytes: new Uint8Array(bytes), contentType: checkin.idPhotoContentType } : null;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(checkin.idPhotoPath);
  if (error || !data) return null;
  return { bytes: new Uint8Array(await data.arrayBuffer()), contentType: checkin.idPhotoContentType };
}

async function listUnpurged(): Promise<OnlineCheckin[]> {
  if (!isSupabaseEnabled()) {
    return (await readJsonFile(FILE, empty)).checkins.filter((c) => !c.purgedAt);
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase.from("online_checkins").select().is("purged_at", null);
  if (error) return [];
  return (data as Row[]).map(fromRow);
}

/**
 * Deletes ID numbers and photos for stays that checked out more than
 * `retentionDays` ago (or were cancelled that long ago). Keeps the rest of
 * the check-in (arrival time, nationality) for the stay record.
 */
export async function purgeExpiredIdData(retentionDays: number, now = Date.now()): Promise<number> {
  const cutoff = new Date(now - retentionDays * 86_400_000).toISOString().slice(0, 10);
  let purged = 0;
  for (const checkin of await listUnpurged()) {
    const reservation = await findReservationById(checkin.reservationId);
    const endDay = reservation?.status === "cancelled"
      ? (reservation.cancelledAt ?? reservation.createdAt).slice(0, 10)
      : reservation?.checkOut;
    if (reservation && endDay && endDay > cutoff) continue;

    if (checkin.idPhotoPath) {
      if (!isSupabaseEnabled()) {
        await fs.rm(path.join(PHOTO_DIR, checkin.idPhotoPath), { force: true });
      } else {
        await getSupabaseAdmin()?.storage.from(BUCKET).remove([checkin.idPhotoPath]);
      }
    }
    const purgedAt = new Date(now).toISOString();
    if (!isSupabaseEnabled()) {
      await updateJsonFile(FILE, empty, (store) => {
        const entry = store.checkins.find((c) => c.reservationId === checkin.reservationId);
        if (entry) {
          delete entry.idNumber;
          delete entry.idPhotoPath;
          delete entry.idPhotoContentType;
          entry.purgedAt = purgedAt;
        }
      });
    } else {
      await getSupabaseAdmin()
        ?.from("online_checkins")
        .update({ id_number: null, id_photo_path: null, id_photo_content_type: null, purged_at: purgedAt })
        .eq("reservation_id", checkin.reservationId);
    }
    purged += 1;
  }
  return purged;
}
