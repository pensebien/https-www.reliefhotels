import { getServerConfig } from "@/lib/config";

type AuthResponse = {
  accessToken: string;
  expiresIn: number;
};

export type MoniepointTransactionStatus = {
  merchantReference: string;
  processingStatus: "PENDING" | "PROCESSED" | "CANCELLED";
  responseCode: string | null;
  responseMessage: string | null;
  actualAmount: number | null;
  actualPaymentMethod: string | null;
  transactionReference: string | null;
};

type TokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

function getMoniepointEnv() {
  const clientId = process.env.MONIEPOINT_CLIENT_ID;
  const clientSecret = process.env.MONIEPOINT_CLIENT_SECRET;
  const terminalSerial = process.env.MONIEPOINT_TERMINAL_SERIAL;
  const baseUrl =
    process.env.MONIEPOINT_BASE_URL?.replace(/\/$/, "") ??
    "https://channel.moniepoint.com";

  const configured = Boolean(clientId && clientSecret && terminalSerial);
  /** Explicit opt-in to simulate mode for local/QA testing (safe to auto-approve). */
  const explicitDemoMode = process.env.DEMO_MODE === "true";

  return {
    clientId: clientId ?? "",
    clientSecret: clientSecret ?? "",
    terminalSerial: terminalSerial ?? "",
    baseUrl,
    configured,
    explicitDemoMode,
    // Kept for the public config surface / "not configured" UI hints — true
    // whenever we can't or won't make a real Moniepoint API call.
    demoMode: explicitDemoMode || !configured,
    transferAccountName: process.env.MONIEPOINT_TRANSFER_ACCOUNT_NAME ?? "",
    transferAccountNumber: process.env.MONIEPOINT_TRANSFER_ACCOUNT_NUMBER ?? "",
    transferBankName: process.env.MONIEPOINT_TRANSFER_BANK_NAME ?? "Moniepoint",
  };
}

export function getMoniepointPublicConfig() {
  const env = getMoniepointEnv();
  return {
    configured: env.configured,
    terminalConfigured: Boolean(env.terminalSerial),
    demoMode: env.demoMode,
    transferAccount:
      env.transferAccountNumber && env.transferAccountName
        ? {
            bankName: env.transferBankName,
            accountNumber: env.transferAccountNumber,
            accountName: env.transferAccountName,
          }
        : null,
  };
}

async function getAccessToken(): Promise<string> {
  const env = getMoniepointEnv();
  if (!env.configured) {
    throw new Error("Moniepoint is not configured");
  }

  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const res = await fetch(`${env.baseUrl}/v1/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: env.clientId,
      clientSecret: env.clientSecret,
    }),
  });

  const data = (await res.json()) as AuthResponse & { message?: string };
  if (!res.ok || !data.accessToken) {
    throw new Error(data.message ?? "Moniepoint authentication failed");
  }

  tokenCache = {
    token: data.accessToken,
    expiresAt: Date.now() + (data.expiresIn ?? 3600) * 1000,
  };

  return data.accessToken;
}

export async function pushTerminalPayment(input: {
  amountKobo: number;
  merchantReference: string;
  paymentMethod?: "CARD_PURCHASE" | "POS_TRANSFER" | "ANY";
}): Promise<{ accepted: boolean; demo: boolean }> {
  const env = getMoniepointEnv();

  if (env.demoMode) {
    console.info("[moniepoint:demo] push payment", input);
    return { accepted: true, demo: true };
  }

  const token = await getAccessToken();
  const res = await fetch(`${env.baseUrl}/v1/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      terminalSerial: env.terminalSerial,
      amount: input.amountKobo,
      merchantReference: input.merchantReference,
      transactionType: "PURCHASE",
      paymentMethod: input.paymentMethod ?? "ANY",
    }),
  });

  if (res.status === 202) {
    return { accepted: true, demo: false };
  }

  const body = (await res.json().catch(() => null)) as {
    message?: string;
    errors?: string[];
  } | null;
  throw new Error(
    body?.message ??
      body?.errors?.[0] ??
      `Moniepoint push failed (${res.status})`,
  );
}

export async function pushTransferPayment(input: {
  amountKobo: number;
  merchantReference: string;
}): Promise<{ accepted: boolean; demo: boolean }> {
  return pushTerminalPayment({
    ...input,
    paymentMethod: "POS_TRANSFER",
  });
}

export async function getTerminalTransactionStatus(
  merchantReference: string,
): Promise<MoniepointTransactionStatus> {
  const env = getMoniepointEnv();

  if (env.explicitDemoMode) {
    return {
      merchantReference,
      processingStatus: "PROCESSED",
      responseCode: "00",
      responseMessage: "Approved (demo)",
      actualAmount: null,
      actualPaymentMethod: "ANY",
      transactionReference: `MP-DEMO-${merchantReference}`,
    };
  }

  if (!env.configured) {
    // No real terminal provisioned and not explicit local/QA demo mode either —
    // never auto-approve a real guest's payment just because Moniepoint isn't
    // set up yet. Stays pending until staff manually confirm (see
    // manuallyConfirmPendingPayment) or real credentials are configured.
    return {
      merchantReference,
      processingStatus: "PENDING",
      responseCode: null,
      responseMessage: "Awaiting manual confirmation — Moniepoint Terminal is not configured",
      actualAmount: null,
      actualPaymentMethod: null,
      transactionReference: null,
    };
  }

  const token = await getAccessToken();
  const res = await fetch(
    `${env.baseUrl}/v1/transactions/merchants/${encodeURIComponent(merchantReference)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = (await res.json()) as MoniepointTransactionStatus & {
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? `Moniepoint status failed (${res.status})`);
  }

  return data;
}

export function isMoniepointPaymentSuccessful(
  status: MoniepointTransactionStatus,
): boolean {
  return (
    status.processingStatus === "PROCESSED" &&
    (status.responseCode === "00" || status.responseCode === "0")
  );
}

export function isMoniepointPaymentCancelled(
  status: MoniepointTransactionStatus,
): boolean {
  return status.processingStatus === "CANCELLED";
}
