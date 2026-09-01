import { getServerConfig } from "@/lib/config";
import { addPayment, findPaymentByReference } from "@/lib/demo-store";
import { paystackFetch } from "@/lib/paystack-auth";
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
    paymentMethod: "paystack",
    paymentChannel: "paystack",
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

  // Auth: Authorization: Bearer SECRET_KEY (https://paystack.com/docs/api/authentication/)
  const res = await paystackFetch(
    config.paystack.secretKey,
    "/transaction/initialize",
    {
      method: "POST",
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
    },
  );

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

  // Never honour demo bypass when real Paystack keys are configured
  if (config.demoMode && demoBypass) {
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

  const res = await paystackFetch(
    config.paystack.secretKey,
    `/transaction/verify/${encodeURIComponent(reference)}`,
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

  const paystackStatus = data.data.status;
  let status: VerifyPaymentResult["status"] = "pending";
  if (paystackStatus === "success") status = "success";
  else if (
    paystackStatus === "failed" ||
    paystackStatus === "abandoned" ||
    paystackStatus === "reversed"
  ) {
    status = "failed";
  }

  return {
    status,
    reference: data.data.reference,
    amountKobo: data.data.amount,
    email: data.data.customer?.email ?? "",
    demo: false,
  };
}
