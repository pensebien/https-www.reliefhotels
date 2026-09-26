import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

/**
 * Crash- and race-safe helpers for the local JSON file stores (demo / dev
 * mode only — production uses Supabase).
 *
 * - Writes go to a temp file and are renamed into place, so a reader never
 *   sees a half-written file.
 * - A missing file starts fresh; an unreadable one throws instead of being
 *   silently replaced with an empty store (which used to wipe all data).
 * - updateJsonFile serializes read-modify-write per file within the process,
 *   so concurrent requests can't overwrite each other's changes.
 */

export async function readJsonFile<T>(file: string, empty: () => T): Promise<T> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw error;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`[json-file-store] ${file} is not valid JSON — refusing to overwrite it`);
  }
}

export async function writeJsonFile(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

const queues = new Map<string, Promise<unknown>>();

/** Runs fn(current) under a per-file lock and persists the store it mutated. */
export async function updateJsonFile<T, R>(
  file: string,
  empty: () => T,
  fn: (store: T) => R | Promise<R>,
): Promise<R> {
  const previous = queues.get(file) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(async () => {
    const store = await readJsonFile(file, empty);
    const result = await fn(store);
    await writeJsonFile(file, store);
    return result;
  });
  queues.set(file, run);
  try {
    return await run;
  } finally {
    if (queues.get(file) === run) queues.delete(file);
  }
}
