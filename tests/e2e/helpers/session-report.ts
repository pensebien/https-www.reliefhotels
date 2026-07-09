import fs from "node:fs";
import path from "node:path";

export type TaskResult = {
  id: string;
  name: string;
  pass: boolean;
  durationMs: number;
  notes?: string;
};

export type SessionResult = {
  participantId: string;
  profile: string;
  device: string;
  automated: true;
  startedAt: string;
  finishedAt: string;
  tasks: TaskResult[];
  tasksPassed: number;
  usabilityScore: number;
  wouldBook: "yes" | "maybe" | "no";
  guestEmail?: string;
  guestName?: string;
};

const OUT_DIR = path.join(process.cwd(), "test-results", "prototype-sessions");

export function ensureSessionDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

export function writeSessionResult(result: SessionResult) {
  ensureSessionDir();
  const file = path.join(OUT_DIR, `${result.participantId}.json`);
  fs.writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

export function scoreUsability(tasksPassed: number, total = 6): number {
  if (tasksPassed >= total) return 5;
  if (tasksPassed >= 5) return 4;
  if (tasksPassed >= 4) return 3;
  if (tasksPassed >= 2) return 2;
  return 1;
}

export function inferWouldBook(tasksPassed: number, total = 6): SessionResult["wouldBook"] {
  if (tasksPassed >= total) return "yes";
  if (tasksPassed >= 5) return "maybe";
  return "no";
}

export async function runTimed<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, durationMs: Date.now() - start };
}
