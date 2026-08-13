/**
 * Paystack reconciliation (Agent S) — read-only diff between what Relief's
 * own store thinks was collected via Paystack and what Paystack's own
 * transaction list actually shows for the same date range.
 *
 * Never auto-corrects: this only ever produces a report. Financial records
 * are never silently rewritten from a reconciliation run (see ADR-010).
 */

import { getServerConfig } from "@/lib/config";
import { resolveLedgerChannel } from "@/lib/accounting/ledger";
import { getActivity } from "@/lib/demo-store";
import { paystackFetch } from "@/lib/paystack-auth";

export type ReconcileDiscrepancyType =
  | "amount_mismatch"
  | "status_mismatch"
  | "missing_on_paystack"
  | "missing_locally";

export type ReconcileDiscrepancy = {
  reference: string;
  type: ReconcileDiscrepancyType;
  localAmountKobo?: number;
  paystackAmountKobo?: number;
  localStatus?: string;
  paystackStatus?: string;
};

export type LocalPaymentSummary = {
  reference: string;
  amountKobo: number;
  status: string;
};

export type PaystackTransactionSummary = {
  reference: string;
  amountKobo: number;
  status: string;
};

/**
 * Pure comparison — no network, fully unit-testable. `local` should already
 * be filtered to the Paystack channel and the date range under review;
 * `remote` is Paystack's own transaction list for the same range.
 */
export function diffPaystackTransactions(
  local: readonly LocalPaymentSummary[],
  remote: readonly PaystackTransactionSummary[],
): ReconcileDiscrepancy[] {
  const remoteByRef = new Map(remote.map((t) => [t.reference, t]));
  const localRefs = new Set(local.map((p) => p.reference));
  const discrepancies: ReconcileDiscrepancy[] = [];

  for (const payment of local) {
    if (payment.status !== "success") continue;

    const match = remoteByRef.get(payment.reference);
    if (!match) {
      discrepancies.push({
        reference: payment.reference,
        type: "missing_on_paystack",
        localAmountKobo: payment.amountKobo,
        localStatus: payment.status,
      });
      continue;
    }

    if (match.amountKobo !== payment.amountKobo) {
      discrepancies.push({
        reference: payment.reference,
        type: "amount_mismatch",
        localAmountKobo: payment.amountKobo,
        paystackAmountKobo: match.amountKobo,
        localStatus: payment.status,
        paystackStatus: match.status,
      });
      continue;
    }

    if (match.status !== "success") {
      discrepancies.push({
        reference: payment.reference,
        type: "status_mismatch",
        localStatus: payment.status,
        paystackStatus: match.status,
      });
    }
  }

  for (const transaction of remote) {
    if (transaction.status !== "success") continue;
    if (localRefs.has(transaction.reference)) continue;
    discrepancies.push({
      reference: transaction.reference,
      type: "missing_locally",
      paystackAmountKobo: transaction.amountKobo,
      paystackStatus: transaction.status,
    });
  }

  return discrepancies;
}

async function fetchPaystackTransactions(
  secretKey: string,
  range: { from: string; to: string },
): Promise<PaystackTransactionSummary[]> {
  const results: PaystackTransactionSummary[] = [];
  const perPage = 100;
  const maxPages = 20; // hard cap — 2,000 transactions is well beyond one date-range review

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      from: `${range.from}T00:00:00.000Z`,
      to: `${range.to}T23:59:59.999Z`,
      perPage: String(perPage),
      page: String(page),
    });

    const res = await paystackFetch(secretKey, `/transaction?${params}`);
    const body = (await res.json()) as {
      status: boolean;
      message?: string;
      data?: { reference: string; amount: number; status: string }[];
    };

    if (!res.ok || !body.status) {
      throw new Error(body.message ?? `Paystack transaction list failed (${res.status})`);
    }

    const pageData = body.data ?? [];
    for (const t of pageData) {
      results.push({ reference: t.reference, amountKobo: t.amount, status: t.status });
    }

    if (pageData.length < perPage) break;
  }

  return results;
}

export type ReconcileResult =
  | {
      ok: true;
      demo: boolean;
      range: { from: string; to: string };
      checkedLocalCount: number;
      checkedRemoteCount: number;
      discrepancies: ReconcileDiscrepancy[];
    }
  | { ok: false; error: string };

export async function reconcilePaystackTransactions(range: {
  from: string;
  to: string;
}): Promise<ReconcileResult> {
  const config = getServerConfig();

  if (!config.paystack.configured || config.demoMode) {
    return {
      ok: true,
      demo: true,
      range,
      checkedLocalCount: 0,
      checkedRemoteCount: 0,
      discrepancies: [],
    };
  }

  try {
    const { payments } = await getActivity();
    const localPaystackPayments: LocalPaymentSummary[] = payments
      .filter((p) => {
        const dateYmd = p.createdAt.slice(0, 10);
        return (
          resolveLedgerChannel(p) === "paystack" &&
          dateYmd >= range.from &&
          dateYmd <= range.to
        );
      })
      .map((p) => ({
        reference: p.reference,
        amountKobo: p.amountKobo,
        status: p.status,
      }));

    const remote = await fetchPaystackTransactions(config.paystack.secretKey, range);
    const discrepancies = diffPaystackTransactions(localPaystackPayments, remote);

    return {
      ok: true,
      demo: false,
      range,
      checkedLocalCount: localPaystackPayments.length,
      checkedRemoteCount: remote.length,
      discrepancies,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Reconciliation failed",
    };
  }
}
