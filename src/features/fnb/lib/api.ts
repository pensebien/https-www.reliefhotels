import type {
  CreateFolioChargeResponse,
  FnbActivityResponse,
  FnbApiError,
  FolioChargeStatus,
  FolioChargesResponse,
} from "@/features/fnb/types";

export const FNB_NOT_DEPLOYED_MESSAGE = "F&B folio API not deployed yet";

export type FnbResult<T> = T | FnbApiError;

export function isFnbError<T>(result: FnbResult<T>): result is FnbApiError {
  return (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as FnbApiError).ok === false
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

async function handleResponse<T>(res: Response): Promise<FnbResult<T>> {
  if (res.status === 404) {
    return { ok: false, notDeployed: true, error: FNB_NOT_DEPLOYED_MESSAGE };
  }
  if (res.status === 401) {
    return { ok: false, unauthorized: true, error: "Invalid staff key." };
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

export async function fetchFnbReservations(
  key: string,
): Promise<FnbResult<FnbActivityResponse>> {
  try {
    const res = await fetch(
      `/api/demo/activity?key=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    );
    return handleResponse<FnbActivityResponse>(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}

export async function fetchFolioCharges(
  reservationId: string,
  key: string,
): Promise<FnbResult<FolioChargesResponse>> {
  try {
    const res = await fetch(
      `/api/staff/folio/charges?reservationId=${encodeURIComponent(reservationId)}&key=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    );
    return handleResponse<FolioChargesResponse>(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}

export async function createFolioCharge(
  payload: { reservationId: string; sku: string; qty: number },
  key: string,
): Promise<FnbResult<CreateFolioChargeResponse>> {
  try {
    const res = await fetch(
      `/api/staff/folio/charges?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-key": key,
        },
        body: JSON.stringify(payload),
      },
    );
    return handleResponse<CreateFolioChargeResponse>(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}

export async function updateFolioChargeStatus(
  id: string,
  status: FolioChargeStatus,
  key: string,
): Promise<FnbResult<CreateFolioChargeResponse>> {
  try {
    const res = await fetch(
      `/api/staff/folio/charges/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-demo-key": key,
        },
        body: JSON.stringify({ status }),
      },
    );
    return handleResponse<CreateFolioChargeResponse>(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}
