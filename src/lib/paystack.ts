import { getServerConfig } from "@/lib/config";
import { addPayment, findPaymentByReference } from "@/lib/demo-store";
import { randomBytes } from "crypto";

export type InitializePaymentInput = {
  email: string;
  amountKobo: number;
  itemType: "room";
  itemId: string;
  itemLabel: string;
  reservationId?: string;
  metadata?: Record<string, string>;
};

export type InitializePaymentResult = {
  reference: string;
  authorizationUrl: string;
  accessCode?: string;
  demo: boolean;
};

function generateReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(4).toString("hex");
  return `RH-${date}-${suffix}`;
}

export async function initializePayment(
  input: InitializePaymentInput,
): Promise<InitializePaymentResult> {
  const config = getServerConfig();
  const reference = generateReference();

  await addPayment({
    reference,
    reservationId: input.reservationId,
    email: input.email,
    amountKobo: input.amountKobo,
    currency: "NGN",
    status: "pending",
    itemType: input.itemType,
    itemId: input.itemId,
    itemLabel: input.itemLabel,
  });

  if (config.demoMode || !config.paystack.configured) {
    const demoUrl = `${config.appUrl}/payment/callback?reference=${reference}&demo=1`;
    return {
      reference,
      authorizationUrl: demoUrl,
      demo: true,
    };
  }

  const callbackUrl = `${config.appUrl}/payment/callback?reference=${reference}`;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.paystack.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference,
      currency: "NGN",
      callback_url: callbackUrl,
      metadata: {
        item_type: input.itemType,
        item_id: input.itemId,
        item_label: input.itemLabel,
        ...(input.reservationId
          ? { reservation_id: input.reservationId }
          : {}),
        ...input.metadata,
      },
    }),
  });

  const data = (await res.json()) as {
    status: boolean;
    message: string;
    data?: {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  };

  if (!res.ok || !data.status || !data.data) {
    throw new Error(data.message ?? "Paystack initialization failed");
  }

  return {
    reference: data.data.reference,
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    demo: false,
  };
}

export type VerifyPaymentResult = {
  status: "success" | "failed" | "pending";
  reference: string;
  amountKobo: number;
  email: string;
  demo: boolean;
};

export async function verifyPayment(
  reference: string,
  demoBypass = false,
): Promise<VerifyPaymentResult> {
  const config = getServerConfig();

  if (demoBypass || (config.demoMode && reference.startsWith("RH-"))) {
    const pending = await findPaymentByReference(reference);
    return {
      status: "success",
      reference,
      amountKobo: pending?.amountKobo ?? 500000,
      email: pending?.email ?? "",
      demo: true,
    };
  }

  if (!config.paystack.configured) {
    return {
      status: "failed",
      reference,
      amountKobo: 0,
      email: "",
      demo: true,
    };
  }

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${config.paystack.secretKey}`,
      },
    },
  );

  const data = (await res.json()) as {
    status: boolean;
    data?: {
      status: string;
      reference: string;
      amount: number;
      customer: { email: string };
    };
  };

  if (!data.data) {
    return {
      status: "failed",
      reference,
      amountKobo: 0,
      email: "",
      demo: false,
    };
  }

  const paid = data.data.status === "success";
  return {
    status: paid ? "success" : "failed",
    reference: data.data.reference,
    amountKobo: data.data.amount,
    email: data.data.customer?.email ?? "",
    demo: false,
  };
}
