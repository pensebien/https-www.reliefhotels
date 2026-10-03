/**
 * Per-room housekeeping state: clean / dirty status for each physical room
 * (unit id, e.g. "guest-room-3") and the tasks done in it each day.
 * Supabase tables room_status / housekeeping_task_log, or JSON in file mode.
 */

import { dataPath } from "@/lib/data-dir";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { readJsonFile, updateJsonFile } from "@/lib/json-file-store";

export type RoomCleanStatus = "clean" | "dirty";

export type RoomStatus = {
  unitId: string;
  status: RoomCleanStatus;
  /** Availability hold created at check-out, released when the room is cleaned. */
  blockId?: string;
  updatedAt: string;
  updatedBy?: string;
};

export type TaskDone = { unitId: string; taskId: string; date: string; doneAt: string; doneBy?: string };

const STATUS_FILE = dataPath("room-status.json");
const TASK_FILE = dataPath("housekeeping-tasks-done.json");
type StatusStore = { rooms: RoomStatus[] };
type TaskStore = { done: TaskDone[] };

export async function listRoomStatus(): Promise<RoomStatus[]> {
  if (!isSupabaseEnabled()) return (await readJsonFile(STATUS_FILE, (): StatusStore => ({ rooms: [] }))).rooms;
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase.from("room_status").select();
  if (error) return [];
  return (data ?? []).map((r) => ({
    unitId: r.unit_id as string,
    status: r.status as RoomCleanStatus,
    blockId: (r.block_id as string | null) ?? undefined,
    updatedAt: r.updated_at as string,
    updatedBy: (r.updated_by as string | null) ?? undefined,
  }));
}

export async function setRoomStatus(entry: Omit<RoomStatus, "updatedAt">): Promise<RoomStatus> {
  const record: RoomStatus = { ...entry, updatedAt: new Date().toISOString() };
  if (!isSupabaseEnabled()) {
    await updateJsonFile(STATUS_FILE, (): StatusStore => ({ rooms: [] }), (store) => {
      store.rooms = [record, ...store.rooms.filter((r) => r.unitId !== record.unitId)];
    });
    return record;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("room_status").upsert({
    unit_id: record.unitId,
    status: record.status,
    block_id: record.blockId ?? null,
    updated_at: record.updatedAt,
    updated_by: record.updatedBy ?? null,
  });
  if (error) throw new Error(error.message);
  return record;
}

export async function listTasksDone(date: string): Promise<TaskDone[]> {
  if (!isSupabaseEnabled()) {
    return (await readJsonFile(TASK_FILE, (): TaskStore => ({ done: [] }))).done.filter((d) => d.date === date);
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase.from("housekeeping_task_log").select().eq("date", date);
  if (error) return [];
  return (data ?? []).map((r) => ({
    unitId: r.unit_id as string,
    taskId: r.task_id as string,
    date: r.date as string,
    doneAt: r.done_at as string,
    doneBy: (r.done_by as string | null) ?? undefined,
  }));
}

export async function setTaskDone(entry: Omit<TaskDone, "doneAt">, done: boolean): Promise<void> {
  const doneAt = new Date().toISOString();
  const same = (d: TaskDone) => d.unitId === entry.unitId && d.taskId === entry.taskId && d.date === entry.date;
  if (!isSupabaseEnabled()) {
    await updateJsonFile(TASK_FILE, (): TaskStore => ({ done: [] }), (store) => {
      store.done = store.done.filter((d) => !same(d as TaskDone));
      if (done) store.done.unshift({ ...entry, doneAt });
      // Keep ~90 days of history.
      const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
      store.done = store.done.filter((d) => d.date >= cutoff);
    });
    return;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase not configured");
  if (done) {
    const { error } = await supabase.from("housekeeping_task_log").upsert({
      unit_id: entry.unitId,
      task_id: entry.taskId,
      date: entry.date,
      done_at: doneAt,
      done_by: entry.doneBy ?? null,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("housekeeping_task_log")
      .delete()
      .eq("unit_id", entry.unitId)
      .eq("task_id", entry.taskId)
      .eq("date", entry.date);
    if (error) throw new Error(error.message);
  }
}
