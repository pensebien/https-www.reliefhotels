import type {
  CashierActivityResponse,
  CashierApiError,
  CashierSettleRequest,
  CashierSettleResponse,
  CashierSettleStatusResponse,
} from "@/features/cashier/types";

export const CASHIER_NOT_DEPLOYED_MESSAGE = "Cashier API not deployed yet";

export type CashierResult<T> = T | CashierApiError;

export function isCashierError<T>(
  result: CashierResult<T>,
): result is CashierApiError {
  return typeof result === "object" && result !== null && "ok" in result &&
    (result as CashierApiError).ok === false;
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function handleResponse<T>(res: Response): Promise<CashierResult<T>> {
  if (res.status === 404) {
    return { ok: false, notDeployed: true, error: CASHIER_NOT_DEPLOYED_MESSAGE };
  }
  if (res.status === 401) {
    return { ok: false, unauthorized: true, error: "Invalid cashier key." };
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

export async function fetchCashierQueue(
  key: string,
): Promise<CashierResult<CashierActivityResponse>> {
  try {
    const res = await fetch(
      `/api/demo/activity?key=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    );
    return handleResponse<CashierActivityResponse>(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}

export async function settleCashierPayment(
  payload: CashierSettleRequest,
  key: string,
): Promise<CashierResult<CashierSettleResponse>> {
  try {
    const res = await fetch(
      `/api/staff/cashier/settle?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-key": key,
        },
        body: JSON.stringify(payload),
      },
    );
    return handleResponse<CashierSettleResponse>(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}

export async function fetchCashierSettleStatus(
  reference: string,
  key: string,
): Promise<CashierResult<CashierSettleStatusResponse>> {
  try {
    const res = await fetch(
      `/api/staff/cashier/settle/status?reference=${encodeURIComponent(reference)}&key=${encodeURIComponent(key)}`,
      { cache: "no-store", headers: { "x-demo-key": key } },
    );
    return handleResponse<CashierSettleStatusResponse>(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}

/** Staff attest a Card/Transfer payment was received when there's no real terminal to verify it. */
export async function confirmCashierSettleManually(
  reference: string,
  key: string,
): Promise<CashierResult<CashierSettleStatusResponse>> {
  try {
    const res = await fetch(
      `/api/staff/cashier/settle/confirm?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-key": key,
        },
        body: JSON.stringify({ reference }),
      },
    );
    return handleResponse<CashierSettleStatusResponse>(res);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}
