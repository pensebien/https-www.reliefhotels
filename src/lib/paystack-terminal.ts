/**
 * Paystack Terminal adapter (ADR-005 — cashier dual POS).
 *
 * Live flow (per Paystack Terminal docs):
 *   1. Resolve/create a customer (`/customer`).
 *   2. Create an invoice — Payment Request API (`POST /paymentrequest`) —
 *      returns `id` + `offline_reference`.
 *   3. Push the invoice to the terminal — Terminal Event API
 *      (`POST /terminal/:terminal_id/event`).
 *   4. Poll `GET /paymentrequest/:id` (or handle the webhook) until paid.
 *
 * Simulate mode (`DEMO_MODE=true` or missing `PAYSTACK_SECRET_KEY` /
 * `PAYSTACK_TERMINAL_ID`): skip the network calls, create a pending payment,
 * and let the status endpoint promote it to `success` on demand.
 */

import {
  findPaymentByReference,
  updatePaymentByReference,
  updateReservationById,
} from "@/lib/demo-store";
import type { PaymentRecord } from "@/lib/demo-store";
import { getProviderMeta, saveProviderMeta } from "@/lib/cashier/store";
import { syncConfirmedReservationToRayza } from "@/lib/integrations/rayza-connect";
import { paystackFetch } from "@/lib/paystack-auth";

function getPaystackTerminalEnv() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";
  const terminalId = process.env.PAYSTACK_TERMINAL_ID ?? "";
  const configured = Boolean(secretKey && terminalId);
  return {
    secretKey,
    terminalId,
    configured,
    demoMode: process.env.DEMO_MODE === "true" || !configured,
  };
}

export function isPaystackTerminalConfigured(): boolean {
  return getPaystackTerminalEnv().configured;
}

async function resolveCustomerCode(email: string, name?: string): Promise<string> {
  const env = getPaystackTerminalEnv();

  const lookup = await paystackFetch(
    env.secretKey,
    `/customer/${encodeURIComponent(email)}`,
  );
  if (lookup.ok) {
    const found = (await lookup.json()) as {
      status: boolean;
      data?: { customer_code: string };
    };
    if (found.status && found.data?.customer_code) {
      return found.data.customer_code;
    }
  }

  const [firstName, ...rest] = (name ?? "Guest").trim().split(/\s+/);
  const created = await paystackFetch(env.secretKey, "/customer", {
    method: "POST",
    body: JSON.stringify({
      email,
      first_name: firstName || "Guest",
      last_name: rest.join(" ") || "Guest",
    }),
  });

  const data = (await created.json()) as {
    status: boolean;
    message?: string;
    data?: { customer_code: string };
  };

  if (!created.ok || !data.status || !data.data) {
    throw new Error(data.message ?? "Unable to create Paystack customer");
  }

  return data.data.customer_code;
}

export type CreatePaymentRequestResult = {
  invoiceId: string;
  offlineReference: string;
  requestCode?: string;
};

export async function createPaymentRequestInvoice(input: {
  email: string;
  name?: string;
  amountKobo: number;
  description: string;
}): Promise<CreatePaymentRequestResult> {
  const env = getPaystackTerminalEnv();
  if (!env.configured) throw new Error("Paystack Terminal is not configured");

  const customerCode = await resolveCustomerCode(input.email, input.name);

  const res = await paystackFetch(env.secretKey, "/paymentrequest", {
    method: "POST",
    body: JSON.stringify({
      customer: customerCode,
      amount: input.amountKobo,
      description: input.description,
      currency: "NGN",
    }),
  });

  const data = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: { id: number; offline_reference: string; request_code: string };
  };

  if (!res.ok || !data.status || !data.data) {
    throw new Error(data.message ?? "Unable to create Paystack payment request");
  }

  return {
    invoiceId: String(data.data.id),
    offlineReference: data.data.offline_reference,
    requestCode: data.data.request_code,
  };
}

export async function pushInvoiceToTerminal(input: {
  invoiceId: string;
  offlineReference: string;
}): Promise<{ eventId?: string }> {
  const env = getPaystackTerminalEnv();
  if (!env.configured) throw new Error("Paystack Terminal is not configured");

  const res = await paystackFetch(
    env.secretKey,
    `/terminal/${encodeURIComponent(env.terminalId)}/event`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "invoice",
        action: "process",
        data: { id: Number(input.invoiceId), reference: input.offlineReference },
      }),
    },
  );

  const data = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: { id: number };
  };

  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Unable to push payment request to terminal");
  }

  return { eventId: data.data?.id ? String(data.data.id) : undefined };
}

async function fetchPaymentRequestStatus(
  invoiceId: string,
): Promise<"success" | "pending" | "failed"> {
  const env = getPaystackTerminalEnv();
  if (!env.configured) return "pending";

  const res = await paystackFetch(
    env.secretKey,
    `/paymentrequest/${encodeURIComponent(invoiceId)}`,
  );

  const data = (await res.json()) as {
    status: boolean;
    data?: { paid?: boolean; status?: string };
  };

  if (!res.ok || !data.status || !data.data) return "pending";
  if (data.data.paid || data.data.status === "success") return "success";
  if (data.data.status === "archived" || data.data.status === "cancelled") {
    return "failed";
  }
  return "pending";
}

export type PaystackTerminalSettleResult = {
  status: "pending";
  demo: boolean;
  externalReference?: string;
  offlineReference?: string;
  providerTerminalId?: string;
};

/** Create (or simulate) a Paystack Terminal payment request for a cashier settle. */
export async function createPaystackTerminalSettlement(input: {
  email: string;
  name?: string;
  amountKobo: number;
  reference: string;
  description: string;
}): Promise<PaystackTerminalSettleResult> {
  const env = getPaystackTerminalEnv();

  if (env.demoMode) {
    console.info(
      "[paystack-terminal:demo] simulate payment request",
      input.reference,
    );
    return { status: "pending", demo: true };
  }

  const invoice = await createPaymentRequestInvoice({
    email: input.email,
    name: input.name,
    amountKobo: input.amountKobo,
    description: input.description,
  });

  await pushInvoiceToTerminal(invoice);

  await saveProviderMeta(input.reference, {
    invoiceId: invoice.invoiceId,
    offlineReference: invoice.offlineReference,
    providerTerminalId: env.terminalId,
  });

  return {
    status: "pending",
    demo: false,
    externalReference: invoice.invoiceId,
    offlineReference: invoice.offlineReference,
    providerTerminalId: env.terminalId,
  };
}

/**
 * Poll (or, in demo mode, auto-promote) a pending Paystack Terminal payment.
 * `demoOverride` mirrors the `?demo=1` bypass already used by `verifyPayment`
 * (`src/lib/paystack.ts`) for the online checkout flow.
 */
export async function syncPaystackTerminalPayment(
  reference: string,
  demoOverride = false,
): Promise<PaymentRecord | null> {
  const payment = await findPaymentByReference(reference);
  if (!payment) return null;
  if (payment.status !== "pending") return payment;

  const env = getPaystackTerminalEnv();

  if (demoOverride || env.demoMode) {
    const updated = await updatePaymentByReference(reference, {
      status: "success",
    });
    if (updated?.reservationId) {
      const confirmed = await updateReservationById(updated.reservationId, {
        status: "confirmed",
        paymentReference: reference,
      });
      if (confirmed) await syncConfirmedReservationToRayza(confirmed);
    }
    return updated ?? payment;
  }

  const meta = await getProviderMeta(reference);
  if (!meta?.invoiceId) return payment;

  const status = await fetchPaymentRequestStatus(meta.invoiceId);

  if (status === "success") {
    const updated = await updatePaymentByReference(reference, {
      status: "success",
      externalReference: meta.offlineReference,
    });
    if (updated?.reservationId) {
      const confirmed = await updateReservationById(updated.reservationId, {
        status: "confirmed",
        paymentReference: reference,
      });
      if (confirmed) await syncConfirmedReservationToRayza(confirmed);
    }
    return updated ?? payment;
  }

  if (status === "failed") {
    const updated = await updatePaymentByReference(reference, {
      status: "failed",
    });
    return updated ?? payment;
  }

  return payment;
}
