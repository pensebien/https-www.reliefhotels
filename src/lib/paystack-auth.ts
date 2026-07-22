/**
 * Paystack API authentication helpers.
 * @see https://paystack.com/docs/api/authentication/
 *
 * Every Paystack API request must send:
 *   Authorization: Bearer SECRET_KEY
 * over HTTPS. Secret keys never belong in client-side code.
 */

export type PaystackKeyMode = "test" | "live" | "unknown";

export function paystackKeyMode(secretKey: string): PaystackKeyMode {
  if (secretKey.startsWith("sk_test_")) return "test";
  if (secretKey.startsWith("sk_live_")) return "live";
  return "unknown";
}

export function isPaystackPublicKey(key: string): boolean {
  return key.startsWith("pk_test_") || key.startsWith("pk_live_");
}

export function isPaystackSecretKey(key: string): boolean {
  return key.startsWith("sk_test_") || key.startsWith("sk_live_");
}

/** Bearer header value for Paystack secret-key requests. */
export function paystackAuthorizationHeader(secretKey: string): string {
  const trimmed = secretKey.trim();
  if (!trimmed) {
    throw new Error("Paystack secret key is missing");
  }
  if (!isPaystackSecretKey(trimmed)) {
    throw new Error(
      "Paystack secret key must start with sk_test_ or sk_live_ (see Paystack authentication docs)",
    );
  }
  return `Bearer ${trimmed}`;
}

export function paystackApiHeaders(
  secretKey: string,
  extra?: HeadersInit,
): HeadersInit {
  return {
    Authorization: paystackAuthorizationHeader(secretKey),
    "Content-Type": "application/json",
    ...extra,
  };
}

/**
 * Authenticated fetch to api.paystack.co.
 * Rejects non-HTTPS URLs so SSL verification cannot be bypassed casually.
 */
export async function paystackFetch(
  secretKey: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = path.startsWith("http")
    ? path
    : `https://api.paystack.co${path.startsWith("/") ? path : `/${path}`}`;

  if (!url.startsWith("https://api.paystack.co")) {
    throw new Error("Paystack requests must use https://api.paystack.co");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", paystackAuthorizationHeader(secretKey));
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...init, headers });
}

/** Lightweight auth check — fails with 401 if the secret key is wrong. */
export async function verifyPaystackAuthentication(
  secretKey: string,
): Promise<{ ok: boolean; mode: PaystackKeyMode; status: number; message: string }> {
  const mode = paystackKeyMode(secretKey);
  try {
    const res = await paystackFetch(secretKey, "/balance");
    const body = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      message?: string;
    };
    if (res.status === 401) {
      return {
        ok: false,
        mode,
        status: 401,
        message: body.message ?? "Unauthorized — check PAYSTACK_SECRET_KEY",
      };
    }
    if (!res.ok || body.status === false) {
      return {
        ok: false,
        mode,
        status: res.status,
        message: body.message ?? `Paystack returned HTTP ${res.status}`,
      };
    }
    return {
      ok: true,
      mode,
      status: res.status,
      message: body.message ?? "Authenticated",
    };
  } catch (error) {
    return {
      ok: false,
      mode,
      status: 0,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}
