import type {
  StaffCalendarActivityResponse,
  StaffCalendarApiError,
  StaffCalendarResult,
} from "@/features/staff-calendar/types";

export function isStaffCalendarError<T>(
  result: StaffCalendarResult<T>,
): result is StaffCalendarApiError {
  return (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as StaffCalendarApiError).ok === false
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

async function handleResponse<T>(
  res: Response,
): Promise<StaffCalendarResult<T>> {
  if (res.status === 401) {
    return { ok: false, unauthorized: true, error: "Invalid dashboard key." };
  }
  if (!res.ok) {
    const body = await parseJsonSafe(res);
    const message =
      (typeof body?.error === "string" && body.error) ||
      `Request failed (${res.status}).`;
    return { ok: false, error: message };
  }
  const body = await parseJsonSafe(res);
  if (!body) {
    return { ok: false, error: "Unexpected empty response." };
  }
  return body as T;
}

export async function fetchStaffCalendarActivity(
  key: string,
): Promise<StaffCalendarResult<StaffCalendarActivityResponse>> {
  try {
    const res = await fetch(
      `/api/demo/activity?key=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    );
    return handleResponse<StaffCalendarActivityResponse>(res);
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Check your connection.",
    };
  }
}
