import type {
  TaxCollectionMode,
  TaxSettingsApiError,
  TaxSettingsResponse,
  TaxSettingsResult,
} from "@/features/staff-tax-settings/types";

export function isTaxSettingsError<T>(
  result: TaxSettingsResult<T>,
): result is TaxSettingsApiError {
  return (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as TaxSettingsApiError).ok === false
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

async function handleResponse<T>(res: Response): Promise<TaxSettingsResult<T>> {
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

export async function fetchTaxSettings(
  key: string | undefined,
): Promise<TaxSettingsResult<TaxSettingsResponse>> {
  try {
    const res = await fetch(`/api/staff/settings/tax${keyQuery(key)}`, {
      cache: "no-store",
    });
    return handleResponse<TaxSettingsResponse>(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}

export async function patchTaxSettings(
  key: string | undefined,
  patch: { vatPercentage?: number; collectionMode?: TaxCollectionMode },
): Promise<TaxSettingsResult<TaxSettingsResponse>> {
  try {
    const res = await fetch(`/api/staff/settings/tax${keyQuery(key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return handleResponse<TaxSettingsResponse>(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}
