import type {
  CreateRoomBlockInput,
  HousekeepingApiError,
  HousekeepingResult,
  RoomBlocksResponse,
} from "@/features/staff-housekeeping/types";

export function isHousekeepingError<T>(
  result: HousekeepingResult<T>,
): result is HousekeepingApiError {
  return (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as HousekeepingApiError).ok === false
  );
}

async function parseJsonSafe(
  res: Response,
): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function handleResponse<T>(res: Response): Promise<HousekeepingResult<T>> {
  if (res.status === 401) {
    return { ok: false, unauthorized: true, error: "Invalid dashboard key." };
  }
  if (res.status === 403) {
    return { ok: false, forbidden: true, error: "Your role cannot do this." };
  }
  if (!res.ok) {
    const body = await parseJsonSafe(res);
    const message =
      (typeof body?.error === "string" && body.error) ||
      `Request failed (${res.status}).`;
    return { ok: false, error: message };
  }
  const body = await parseJsonSafe(res);
  if (!body) return { ok: false, error: "Unexpected empty response." };
  return body as T;
}

function keyQuery(key: string | undefined): string {
  return key ? `?key=${encodeURIComponent(key)}` : "";
}

export async function fetchRoomBlocks(
  key: string | undefined,
): Promise<HousekeepingResult<RoomBlocksResponse>> {
  try {
    const res = await fetch(`/api/staff/room-blocks${keyQuery(key)}`, {
      cache: "no-store",
    });
    return handleResponse<RoomBlocksResponse>(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}

export async function createRoomBlock(
  key: string | undefined,
  input: CreateRoomBlockInput,
): Promise<HousekeepingResult<{ ok: true; block: RoomBlocksResponse["blocks"][number] }>> {
  try {
    const res = await fetch(`/api/staff/room-blocks${keyQuery(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}

export async function deleteRoomBlock(
  key: string | undefined,
  id: string,
): Promise<HousekeepingResult<{ ok: true }>> {
  try {
    const res = await fetch(
      `/api/staff/room-blocks/${encodeURIComponent(id)}${keyQuery(key)}`,
      { method: "DELETE" },
    );
    return handleResponse(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}
