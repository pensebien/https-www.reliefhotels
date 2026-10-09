/**
 * The app's one logger (house pattern, see ~/.claude/skills/logging).
 *
 *   const log = new Logger("rayza");
 *   log.info("Booking pushed", { reservation_id: id, refs: 2 });
 *
 * - Levels debug < info < warning < error, gated by LOG_LEVEL (default info);
 *   error is always written.
 * - One line per event: `[ISO-8601 UTC] [LEVEL] [scope] message {json}`.
 *   Messages are constant strings; variables go in the context.
 * - Production (Netlify): stdout, which Netlify keeps as function logs.
 *   File mode (local/dev): also appended to <data>/logs/relief[-scope]-<UTC date>.log
 *   (outside the web root; files older than LOG_RETENTION_DAYS are pruned daily).
 * - Context keys that look like secrets are redacted, recursively.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { dataPath } from "@/lib/data-dir";
import { isSupabaseEnabled } from "@/lib/db/client";

export const LOG_LEVELS = ["debug", "info", "warning", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
export type LogContext = Record<string, unknown>;

const RANK: Record<LogLevel, number> = { debug: 0, info: 1, warning: 2, error: 3 };
const SECRET_KEY = /pass|secret|token|key|auth|authorization|pin/i;
const APP = "relief";

let cachedLevel: { raw: string | undefined; level: LogLevel } | null = null;

/** LOG_LEVEL, checked against the same list the ranks use; memoized per value. */
export function configuredLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (cachedLevel && cachedLevel.raw === raw) return cachedLevel.level;
  const level = (LOG_LEVELS as readonly string[]).includes(raw ?? "") ? (raw as LogLevel) : "info";
  cachedLevel = { raw, level };
  return level;
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (value instanceof Error) return { message: value.message, name: value.name };
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET_KEY.test(k) ? "[redacted]" : redact(v, depth + 1)]),
  );
}

const sanitize = (scope: string) => scope.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 40);
export const logFileName = (date: string, scope?: string) => `${APP}${scope ? `-${sanitize(scope)}` : ""}-${date}.log`;
export const logDir = () => dataPath("logs");

export function formatLine(level: LogLevel, scope: string | undefined, message: string, context?: LogContext): string {
  const ctx = context && Object.keys(context).length ? ` ${JSON.stringify(redact(context))}` : "";
  return `[${new Date().toISOString()}] [${level.toUpperCase()}]${scope ? ` [${scope}]` : ""} ${message}${ctx}`;
}

export class Logger {
  private scope?: string;

  constructor(scope?: string) {
    this.scope = scope;
  }

  /** Same logger, another scope (e.g. a cron run for one integration). */
  child(scope: string): Logger {
    return new Logger(scope);
  }

  setScope(scope: string | undefined): void {
    this.scope = scope;
  }

  getScope(): string | undefined {
    return this.scope;
  }

  debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  warning(message: string, context?: LogContext): void {
    this.write("warning", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write("error", message, context);
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (level !== "error" && RANK[level] < RANK[configuredLevel()]) return;
    const line = formatLine(level, this.scope, message, context);
    (level === "error" ? console.error : level === "warning" ? console.warn : console.log)(line);
    if (!isSupabaseEnabled() && process.env.LOG_TO_FILE !== "false") void appendToFile(this.scope, line);
  }
}

async function appendToFile(scope: string | undefined, line: string): Promise<void> {
  try {
    const dir = logDir();
    await fs.mkdir(dir, { recursive: true });
    // One small O_APPEND write per line: atomic on POSIX, so concurrent writers don't interleave.
    await fs.appendFile(path.join(dir, logFileName(new Date().toISOString().slice(0, 10), scope)), `${line}\n`, { flag: "a" });
  } catch {
    // Logging must never break the request; stdout already has the line.
  }
}

/** Delete log files older than LOG_RETENTION_DAYS (default 30). Run from the daily job. */
export async function pruneLogs(now = Date.now()): Promise<number> {
  const days = Math.max(1, Number(process.env.LOG_RETENTION_DAYS ?? 30) || 30);
  const cutoff = new Date(now - days * 86_400_000).toISOString().slice(0, 10);
  let removed = 0;
  try {
    for (const name of await fs.readdir(logDir())) {
      const date = name.match(/-(\d{4}-\d{2}-\d{2})\.log$/)?.[1];
      if (name.startsWith(`${APP}`) && date && date < cutoff) {
        await fs.rm(path.join(logDir(), name), { force: true });
        removed++;
      }
    }
  } catch {
    // No log dir yet.
  }
  return removed;
}

/** Last lines of one day's file for a scope (file mode viewer); same names and UTC dates as the writer. */
export async function readLogTail(date: string, scope?: string, lines = 500): Promise<string[]> {
  try {
    const text = await fs.readFile(path.join(logDir(), logFileName(date, scope)), "utf-8");
    return text.trimEnd().split("\n").slice(-lines);
  } catch {
    return [];
  }
}
