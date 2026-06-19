import { createHash } from "node:crypto";

/** Deterministic UUID for demo rows — same key → same id in app seeds and Supabase. */
export function stableDemoUuid(key: string): string {
  const bytes = createHash("sha256")
    .update(`reliefhotels-demo:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export const DEMO_SOURCE = "demo" as const;
