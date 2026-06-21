import { getServerConfig } from "@/lib/config";
import { NextResponse } from "next/server";

export function isValidDashboardKey(key: string | null | undefined): boolean {
  if (!key) return false;
  return key === getServerConfig().demoDashboardKey;
}

export function unauthorizedDashboardResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
