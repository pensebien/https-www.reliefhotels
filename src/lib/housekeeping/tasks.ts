/**
 * Recurring housekeeping tasks (Sirvoy "Housekeeping → Tasks"): what's due in
 * a room today depends on whether a guest leaves, stays over or arrives, and
 * on how often the task repeats during a stay.
 */

import { readSettingsDoc, writeSettingsDoc } from "@/lib/settings-store";
import { z } from "zod";

export const housekeepingTaskSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  name: z.string().trim().min(1).max(60),
  /** departure: after the guest leaves; stayover: during a stay; arrival: before a guest arrives. */
  on: z.enum(["departure", "stayover", "arrival"]),
  /** For stay-over tasks: every N nights (1 = daily). */
  everyNights: z.number().int().min(1).max(30),
  active: z.boolean(),
});

export const housekeepingTasksSchema = z.object({ tasks: z.array(housekeepingTaskSchema).max(20) });

export type HousekeepingTask = z.infer<typeof housekeepingTaskSchema>;

export const DEFAULT_HOUSEKEEPING_TASKS: { tasks: HousekeepingTask[] } = {
  tasks: [
    { id: "departure-clean", name: "Full clean after check-out", on: "departure", everyNights: 1, active: true },
    { id: "stayover-tidy", name: "Stay-over tidy", on: "stayover", everyNights: 1, active: true },
    { id: "linen-change", name: "Change linen", on: "stayover", everyNights: 3, active: true },
    { id: "arrival-check", name: "Check room before arrival", on: "arrival", everyNights: 1, active: true },
  ],
};

const KEY = "housekeeping_tasks";

export async function getHousekeepingTasks(): Promise<HousekeepingTask[]> {
  const doc = await readSettingsDoc(KEY, (raw) => {
    const parsed = housekeepingTasksSchema.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_HOUSEKEEPING_TASKS;
  });
  return doc.tasks;
}

export async function saveHousekeepingTasks(input: unknown): Promise<HousekeepingTask[]> {
  const parsed = housekeepingTasksSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  return (await writeSettingsDoc(KEY, parsed.data)).tasks;
}
