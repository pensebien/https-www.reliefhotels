import { timingSafeEqual } from "node:crypto";
import { getServerConfig } from "@/lib/config";
import { NextResponse } from "next/server";

export function isValidDashboardKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const given = Buffer.from(key);
  const expected = Buffer.from(getServerConfig().demoDashboardKey);
  // Constant-time, so response timing doesn't leak how much of the key matched.
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function unauthorizedDashboardResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
