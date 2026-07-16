import type {
  AccountingActivityResponse,
  AccountingApiError,
} from "@/features/accounting/types";

export const ACCOUNTING_NOT_DEPLOYED_MESSAGE = "Activity API not deployed yet";

export type AccountingResult<T> = T | AccountingApiError;

export function isAccountingError<T>(
  result: AccountingResult<T>,
): result is AccountingApiError {
  return (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as AccountingApiError).ok === false
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
): Promise<AccountingResult<T>> {
  if (res.status === 404) {
    return {
      ok: false,
      notDeployed: true,
      error: ACCOUNTING_NOT_DEPLOYED_MESSAGE,
    };
  }
  if (res.status === 401) {
    return { ok: false, unauthorized: true, error: "Invalid accounting key." };
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

export async function fetchAccountingActivity(
  key: string,
): Promise<AccountingResult<AccountingActivityResponse>> {
  try {
    const res = await fetch(
      `/api/demo/activity?key=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    );
    return handleResponse<AccountingActivityResponse>(res);
  } catch {
    return {
      ok: false,
      error: "Could not reach the server. Check your connection.",
    };
  }
}
